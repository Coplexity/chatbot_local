import asyncio
from collections import defaultdict

from langchain_openai import ChatOpenAI

from core import config
from core.prompts import TOPIC_AGGREGATOR_PROMPT
from core.schemas import RouterState


class TopicAggregatorNode:
    """Aggregate document-level reports into topic-level reports."""

    def __init__(self):
        print("⏳ [Topic Aggregator] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)

    async def process(self, state: RouterState):
        query = state.get("query", "")
        document_reports = state.get("document_reports", [])
        if not document_reports:
            return {"topic_reports": []}

        reports_by_topic = defaultdict(list)
        for item in document_reports:
            # Keep exact chu_de from DB as requested (no normalization).
            chu_de = item.get("chu_de") or "khong_xac_dinh"
            reports_by_topic[chu_de].append(item)

        async def aggregate_single_group(chu_de, reports):
            ranked_reports = sorted(reports, key=lambda x: int(x.get("version_id", 0)))
            all_reports_text = ""
            source_guideline_ids = []
            for index, report in enumerate(ranked_reports, start=1):
                guideline_id = report.get("guideline_id", "")
                version_id = report.get("version_id", "")
                source_guideline_ids.append(str(guideline_id))
                all_reports_text += (
                    f"\n--- BÁO CÁO VĂN BẢN {index}"
                    f" | guideline_id={guideline_id}"
                    f" | version_id={version_id}"
                    f" ---\n"
                    f"{report.get('report', '')}\n"
                )
            prompt = TOPIC_AGGREGATOR_PROMPT.format(
                chu_de=chu_de.upper(),
                query=query,
                all_reports_text=all_reports_text,
            )
            response = await self.llm.ainvoke(prompt)
            return {
                "chu_de": chu_de,
                "report": response.content,
                "source_guideline_ids": source_guideline_ids,
            }

        tasks = [
            aggregate_single_group(chu_de, reports)
            for chu_de, reports in reports_by_topic.items()
        ]
        topic_reports = await asyncio.gather(*tasks) if tasks else []
        print(
            "🧩 [Topic Aggregator] "
            f"Đã tổng hợp {len(topic_reports)} báo cáo chủ đề từ {len(document_reports)} báo cáo văn bản."
        )
        return {"topic_reports": topic_reports}