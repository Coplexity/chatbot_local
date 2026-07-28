"""Scientific workflow fallback.

The SSE orchestrator in ``app.cli`` is the primary execution path.  This
class deliberately uses the same nodes, so a future non-SSE caller cannot
silently revive the retired medical graph.
"""
from core.schemas import RouterState
from nodes.reasoning.domain_experts import DomainExpertsNode
from nodes.reasoning.disease_aggregator import TopicAggregatorNode
from nodes.reasoning.global_synthesizer import GlobalSynthesizerNode
from nodes.reasoning.specialty_aggregator import AuthorAggregatorNode
from nodes.retrieval.vector_retrieval import VectorRetrievalNode
from nodes.routing.active_version_filter import ActiveVersionFilterNode
from nodes.routing.disease_routing import DocumentTypeRoutingNode
from nodes.routing.guideline_owner_filter import GuidelineOwnerFilterNode
from nodes.routing.specialty_routing import TopicRoutingNode


class ScientificSearchWorkflow:
    def __init__(self):
        self.guideline_filter = GuidelineOwnerFilterNode()
        self.topic_router = TopicRoutingNode()
        self.document_type_router = DocumentTypeRoutingNode()
        self.version_filter = ActiveVersionFilterNode()
        self.retriever = VectorRetrievalNode()
        self.experts = DomainExpertsNode()
        self.topic_aggregator = TopicAggregatorNode()
        self.author_aggregator = AuthorAggregatorNode()
        self.synthesizer = GlobalSynthesizerNode()

        # Compatibility attributes used by the current SSE orchestrator.
        self.router = self.topic_router
        self.disease_router = self.document_type_router
        self.disease_aggregator = self.topic_aggregator
        self.specialty_aggregator = self.author_aggregator
        self.app = self

    @staticmethod
    def route_logic(state: RouterState) -> str:
        return "document_type_router" if state.get("selected_topics") else "synthesis_node"

    @staticmethod
    def disease_route_logic(state: RouterState) -> str:
        return "version_filter" if state.get("selected_document_types") else "synthesis_node"

    @staticmethod
    def version_filter_logic(state: RouterState) -> str:
        return "retriever" if state.get("active_version_ids") else "synthesis_node"

    async def run_aggregate(self, state: RouterState) -> RouterState:
        """Non-SSE fallback through exactly the same scientific pipeline."""
        state.update(self.guideline_filter.process(state))
        state.update(self.topic_router.process(state))
        state.update(await self.document_type_router.process(state))
        state.update(self.version_filter.process(state))
        state.update(await self.retriever.process(state))
        state.update(await self.experts.process(state))
        state.update(await self.topic_aggregator.process(state))
        state.update(await self.author_aggregator.process(state))
        return state


# Retain the import name while downstream services migrate.
MedicalWorkflow = ScientificSearchWorkflow
