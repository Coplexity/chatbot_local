import asyncio
from langchain_openai import ChatOpenAI
from core import config
from core.schemas import RouterState, SpecialtyDiseaseDecision
from core.prompts import DISEASE_ROUTING_PROMPT
from core.database import DatabaseManager


class DiseaseRoutingNode:
    """Node Ä‘á»‹nh tuyáº¿n bá»‡nh theo loai_van_ban tá»« database."""

    def __init__(self):
        print("â³ [Disease Router] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def _load_disease_candidates(self, specialty_name: str, guideline_ids=None):
        conn = None
        cursor = None
        try:
            if not specialty_name:
                return []
            if guideline_ids is not None and not guideline_ids:
                return []

            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            guideline_filter_sql = "AND guideline_id = ANY(%s)" if guideline_ids is not None else ""
            params = [specialty_name]
            if guideline_ids is not None:
                params.append(guideline_ids)
            cursor.execute(
                f"""
                SELECT DISTINCT loai_van_ban
                FROM guidelines
                WHERE chu_de = %s
                  AND loai_van_ban IS NOT NULL
                  AND btrim(loai_van_ban) <> ''
                  {guideline_filter_sql}
                ORDER BY loai_van_ban;
                """,
                tuple(params),
            )
            rows = cursor.fetchall()
            return [row[0] for row in rows]
        except Exception as e:
            print(f"âŒ [Disease Router DB Error] {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    async def process(self, state: RouterState):
        query = state.get("query", "")
        analyzed_specialties = state.get("analyzed_specialties", [])
        filtered_guideline_ids = state.get("filtered_guideline_ids")

        specialty_names = [item.get("name") for item in analyzed_specialties if item.get("name")]
        specialty_names = list(dict.fromkeys(specialty_names))

        if not specialty_names:
            return {
                "routed_diseases": {},
            }

        async def route_single_specialty(specialty_name: str):
            candidates = self._load_disease_candidates(specialty_name, filtered_guideline_ids)
            if not candidates:
                print(f"âš ï¸ [Disease Router] KhÃ´ng cÃ³ á»©ng viÃªn bá»‡nh cho khoa {specialty_name}.")
                return specialty_name, []

            candidates_string = "\n".join([f"- {specialty_name}: {disease}" for disease in candidates])
            prompt = DISEASE_ROUTING_PROMPT.format(
                specialties_string=specialty_name,
                candidates_string=candidates_string,
                query=query,
            )

            structured_llm = self.llm.with_structured_output(SpecialtyDiseaseDecision)
            try:
                decision = await structured_llm.ainvoke(prompt)
                valid_diseases = set(candidates)
                selected = []
                seen = set()

                for disease_name in decision.loai_van_ban:
                    if disease_name in valid_diseases and disease_name not in seen:
                        seen.add(disease_name)
                        selected.append(disease_name)

                if not selected:
                    print(f"âš ï¸ [Disease Router] {specialty_name}: LLM khÃ´ng tráº£ bá»‡nh há»£p lá»‡, fallback vá» candidates DB.")
                    return specialty_name, candidates

                return specialty_name, selected
            except Exception as e:
                print(f"âŒ [Disease Router Error] {specialty_name}: {e}")
                return specialty_name, candidates

        tasks = [route_single_specialty(name) for name in specialty_names]
        results = await asyncio.gather(*tasks) if tasks else []

        grouped_diseases = {specialty: diseases for specialty, diseases in results if diseases}

        if not grouped_diseases:
            print("âš ï¸ [Disease Router] KhÃ´ng route Ä‘Æ°á»£c bá»‡nh há»£p lá»‡ tá»« táº¥t cáº£ chuyÃªn khoa.")
            return {"routed_diseases": {}}

        total_diseases = sum(len(diseases) for diseases in grouped_diseases.values())
        print(f"ðŸŽ¯ [Disease Router] Tá»•ng sá»‘ bá»‡nh route Ä‘Æ°á»£c: {total_diseases}")
        return {
            "routed_diseases": grouped_diseases,
        }

