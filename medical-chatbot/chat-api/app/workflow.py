from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from core.schemas import RouterState

from nodes.reasoning.question_validator import QuestionValidatorNode
from nodes.routing.guideline_owner_filter import GuidelineOwnerFilterNode
from nodes.routing.specialty_routing import SpecialtyRoutingNode
from nodes.routing.disease_routing import DiseaseRoutingNode
from nodes.routing.active_version_filter import ActiveVersionFilterNode
from nodes.retrieval.vector_retrieval import VectorRetrievalNode
from nodes.reasoning.domain_experts import DomainExpertsNode
from nodes.reasoning.disease_aggregator import DiseaseAggregatorNode
from nodes.reasoning.specialty_aggregator import SpecialtyAggregatorNode
from nodes.reasoning.global_synthesizer import GlobalSynthesizerNode


class MedicalWorkflow:
    def __init__(self):
        self.validator = QuestionValidatorNode()
        self.guideline_filter = GuidelineOwnerFilterNode()
        self.router = SpecialtyRoutingNode()
        self.disease_router = DiseaseRoutingNode()
        self.version_filter = ActiveVersionFilterNode()
        self.retriever = VectorRetrievalNode()
        self.experts = DomainExpertsNode()
        self.disease_aggregator = DiseaseAggregatorNode()
        self.specialty_aggregator = SpecialtyAggregatorNode()
        self.synthesizer = GlobalSynthesizerNode()

        self.memory = MemorySaver()
        self.app = self._build_graph()

    def route_logic(self, state: RouterState) -> str:
        if not state.get("analyzed_specialties"):
            return "synthesis_node"
        return "disease_router_node"

    def disease_route_logic(self, state: RouterState) -> str:
        if not state.get("routed_diseases"):
            return "synthesis_node"
        return "version_filter_node"

    def version_filter_logic(self, state: RouterState) -> str:
        if not state.get("active_version_ids"):
            return "synthesis_node"
        return "vector_retrieval_node"

    def validation_logic(self, state: RouterState) -> str:
        """Route to intent analyzer (cli.py already filters greeting/off_topic before workflow)"""
        return "intent_analyzer"

    def retrieval_logic(self, state: RouterState) -> str:
        if not state.get("document_contexts"):
            return "synthesis_node"
        return "domain_experts_node"

    def expert_bypass_logic(self, state: RouterState) -> str:
        document_reports = state.get("document_reports", [])
        if len(document_reports) == 1:
            return "synthesis_node"
        if not document_reports:
            return "synthesis_node"
        return "disease_aggregator_node"

    def disease_aggregation_logic(self, state: RouterState) -> str:
        if not state.get("disease_reports"):
            return "synthesis_node"
        return "specialty_aggregator_node"

    def specialty_aggregation_logic(self, state: RouterState) -> str:
        if not state.get("specialty_report_items"):
            return "synthesis_node"
        return "synthesis_node"

    def _build_graph(self):
        builder = StateGraph(RouterState)

        builder.add_node("question_validator", self.validator.process)
        builder.add_node("guideline_owner_filter", self.guideline_filter.process)
        builder.add_node("intent_analyzer", self.router.process)
        builder.add_node("disease_router", self.disease_router.process)
        builder.add_node("active_version_filter", self.version_filter.process)
        builder.add_node("vector_retrieval", self.retriever.process)
        builder.add_node("domain_experts", self.experts.process)
        builder.add_node("disease_aggregator", self.disease_aggregator.process)
        builder.add_node("specialty_aggregator", self.specialty_aggregator.process)
        builder.add_node("global_synthesizer", self.synthesizer.process)

        builder.add_edge(START, "question_validator")
        builder.add_edge("question_validator", "guideline_owner_filter")
        builder.add_edge("guideline_owner_filter", "intent_analyzer")
        builder.add_conditional_edges(
            "intent_analyzer", self.route_logic,
            {"disease_router_node": "disease_router", "synthesis_node": "global_synthesizer"}
        )
        builder.add_conditional_edges(
            "disease_router", self.disease_route_logic,
            {"version_filter_node": "active_version_filter", "synthesis_node": "global_synthesizer"}
        )
        builder.add_conditional_edges(
            "active_version_filter", self.version_filter_logic,
            {"vector_retrieval_node": "vector_retrieval", "synthesis_node": "global_synthesizer"}
        )
        builder.add_conditional_edges(
            "vector_retrieval", self.retrieval_logic,
            {"domain_experts_node": "domain_experts", "synthesis_node": "global_synthesizer"}
        )
        builder.add_conditional_edges(
            "domain_experts", self.expert_bypass_logic,
            {
                "disease_aggregator_node": "disease_aggregator",
                "synthesis_node": "global_synthesizer",
            }
        )
        builder.add_conditional_edges(
            "disease_aggregator", self.disease_aggregation_logic,
            {"specialty_aggregator_node": "specialty_aggregator", "synthesis_node": "global_synthesizer"}
        )
        builder.add_conditional_edges(
            "specialty_aggregator", self.specialty_aggregation_logic,
            {"synthesis_node": "global_synthesizer"}
        )
        builder.add_edge("global_synthesizer", END)

        return builder.compile(checkpointer=self.memory)

    @staticmethod
    def _greeting_response(state: RouterState):
        """Return friendly greeting response with invitation to ask medical questions"""
        return {
            "response": (
                "👋 Cảm ơn bạn! Tôi rất vui gặp bạn.\n\n"
                "Tôi là một trợ lý y tế thông minh, chuyên giúp bạn trả lời các câu hỏi về sức khỏe và bệnh tật.\n\n"
                "**Hãy hỏi tôi về:**\n"
                "- Các triệu chứng bạn đang gặp\n"
                "- Thông tin về bệnh tật\n"
                "- Cách điều trị và phòng ngừa\n"
                "- Lời khuyên về sức khỏe\n\n"
                "📌 **Ví dụ:**\n"
                "- 'Tôi bị sốt và đau đầu'\n"
                "- 'Viêm phổi là gì?'\n"
                "- 'Làm sao để giảm cân an toàn?'"
            )
        }

    @staticmethod
    def _off_topic_response(state: RouterState):
        """Return friendly off-topic response with suggestion"""
        return {
            "response": (
                "😊 Câu hỏi thú vị! Nhưng tôi chuyên về y tế nên có thể không phải lúc tốt nhất để giúp.\n\n"
                "🏥 Tôi chuyên trợ giúp về:\n"
                "- Các triệu chứng hoặc bệnh tật\n"
                "- Cách phòng ngừa và điều trị\n"
                "- Lời khuyên về sức khỏe và thể dục\n"
                "- Thông tin về xét nghiệm hoặc chẩn đoán\n\n"
                "📌 **Hãy hỏi tôi về:**\n"
                "- 'Tôi bị đau đầu liên tục, phải làm sao?'\n"
                "- 'Viêm phổi là gì và cách điều trị?'\n"
                "- 'Làm sao để giảm cân an toàn?'"
            )
        }
