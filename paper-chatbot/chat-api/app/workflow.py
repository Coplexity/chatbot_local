"""Scientific workflow fallback.

The SSE orchestrator in ``app.cli`` is the primary execution path.  This
class deliberately uses the same nodes, so a future non-SSE caller cannot
silently revive the retired medical graph.
"""
from core.schemas import RouterState
from nodes.reasoning.document_experts import DocumentExpertsNode
from nodes.reasoning.global_synthesizer import GlobalSynthesizerNode
from nodes.reasoning.topic_aggregator import TopicAggregatorNode    
from nodes.retrieval.vector_retrieval import VectorRetrievalNode
from nodes.routing.active_version_filter import ActiveVersionFilterNode
from nodes.routing.guideline_owner_filter import GuidelineOwnerFilterNode
from nodes.routing.topic_routing import TopicRoutingNode
from nodes.reasoning.question_validator import QuestionValidatorNode
from nodes.reasoning.safe_catalogue_search import SafeCatalogueSearchNode
from nodes.reasoning.catalogue_nl_formatter import CatalogueResultFormatterNode


class ScientificSearchWorkflow:
    def __init__(self):
        self.guideline_filter = GuidelineOwnerFilterNode()
        self.topic_router = TopicRoutingNode()
        self.version_filter = ActiveVersionFilterNode()
        self.retriever = VectorRetrievalNode()
        self.experts = DocumentExpertsNode()
        self.topic_aggregator = TopicAggregatorNode()
        self.synthesizer = GlobalSynthesizerNode()
        self.question_validator = QuestionValidatorNode()
        self.catalogue_search = SafeCatalogueSearchNode()
        self.catalogue_nl_formatter = CatalogueResultFormatterNode()
        self.app = self

    @staticmethod
    def route_logic(state: RouterState) -> str:
        return "version_filter" if state.get("selected_topics") else "synthesis_node"

    @staticmethod
    def version_filter_logic(state: RouterState) -> str:
        return "retriever" if state.get("active_version_ids") else "synthesis_node"

    async def run_aggregate(self, state: RouterState) -> RouterState:
        """Non-SSE fallback through exactly the same scientific pipeline."""
        state.update(self.question_validator.process(state))
        state.update(self.guideline_filter.process(state))
        state.update(self.topic_router.process(state))
        state.update(self.version_filter.process(state))
        state.update(await self.retriever.process(state))
        state.update(await self.experts.process(state))
        state.update(await self.topic_aggregator.process(state))
        state.update(await self.synthesizer.process(state))
        return state