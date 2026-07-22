from langchain_openai import ChatOpenAI
from core import config
from basic_mode.core.schemas import RouterState, RouteDecision
from basic_mode.core.prompts import ROUTER_PROMPT
from core.database import DatabaseManager


class SpecialtyRoutingNode:
    """Class Ä‘áº£m nhiá»‡m viá»‡c phÃ¢n tÃ­ch Ã½ Ä‘á»‹nh vÃ  Ä‘á»‹nh tuyáº¿n (Routing)."""

    def __init__(self):
        print("â³ [Router] Initializing Intent Analyzer...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def _load_valid_domains(self, guideline_ids=None):
        """Láº¥y danh sÃ¡ch chuyÃªn khoa tá»« báº£ng guidelines, cÃ³ thá»ƒ giá»›i háº¡n theo guideline_ids."""
        if guideline_ids is not None and not guideline_ids:
            return []

        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            guideline_filter_sql = "AND guideline_id = ANY(%s)" if guideline_ids is not None else ""
            params = (guideline_ids,) if guideline_ids is not None else ()
            cursor.execute(
                f"""
                SELECT DISTINCT chu_de
                FROM guidelines
                WHERE chu_de IS NOT NULL
                  AND btrim(chu_de) <> ''
                  {guideline_filter_sql}
                ORDER BY chu_de;
                """,
                params,
            )
            rows = cursor.fetchall()
            return [row[0] for row in rows]
        except Exception as e:
            print(f"âŒ [Router DB Error] KhÃ´ng táº£i Ä‘Æ°á»£c valid domains: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def process(self, state: RouterState):
        query = state["query"]
        structured_llm = self.llm.with_structured_output(RouteDecision)

        valid_domains = state.get("filtered_specialties")
        if valid_domains is None:
            valid_domains = self._load_valid_domains(state.get("filtered_guideline_ids"))

        if not valid_domains:
            print("âš ï¸ [Router] KhÃ´ng tÃ¬m tháº¥y chuyÃªn khoa há»£p lá»‡ trong guidelines Ä‘Ã£ lá»c.")
            return {"analyzed_specialties": [], "hypothetical_document": ""}

        # Biáº¿n danh sÃ¡ch trÃªn thÃ nh má»™t chuá»—i vÄƒn báº£n (VD: "tim_mach, ho_hap, ...")
        domains_string = ", ".join(valid_domains)

        # Gá»ŒI PROMPT Tá»ª FILE Má»šI VÃ€ TRUYá»€N BIáº¾N VÃ€O
        prompt = ROUTER_PROMPT.format(
            domains_string=domains_string,
            query=query,
        )

        decision = structured_llm.invoke(prompt)

        filtered_domains = [
            {"name": s.name}
            for s in decision.analyzed_specialties
            if s.name in valid_domains
        ]

        print(f"ðŸ§­ [Router] Äiá»u phá»‘i Ä‘áº¿n cÃ¡c domain: {[s['name'] for s in filtered_domains]}")
        return {"analyzed_specialties": filtered_domains, "hypothetical_document": decision.hypothetical_document}

