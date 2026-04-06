from langgraph.graph import END, StateGraph

from app.agents.nodes.composer_dispatch import composer_dispatch
from app.agents.nodes.composer_essays import composer_essays
from app.agents.nodes.digest_assembler import digest_assembler
from app.agents.nodes.diversity_checker import diversity_checker
from app.agents.nodes.extractor import extractor
from app.agents.nodes.fetcher import fetcher
from app.agents.nodes.quality_filter import quality_filter
from app.agents.nodes.relevance_matcher import relevance_matcher
from app.agents.nodes.research_agent import research_agent
from app.agents.state import DigestState


def build_digest_graph() -> StateGraph:
    """Build the 8-node digest pipeline DAG.

    Pipeline:
      fetcher → extractor → quality_filter → relevance_matcher
        → [parallel fan-out]
            Track 1: composer_dispatch ──────────────────────────┐
            Track 2: research_agent → composer_essays → diversity_checker ┤
        → digest_assembler → END
    """
    graph = StateGraph(DigestState)

    # Add nodes
    graph.add_node("fetcher", fetcher)
    graph.add_node("extractor", extractor)
    graph.add_node("quality_filter", quality_filter)
    graph.add_node("relevance_matcher", relevance_matcher)
    graph.add_node("composer_dispatch", composer_dispatch)
    graph.add_node("research_agent", research_agent)
    graph.add_node("composer_essays", composer_essays)
    graph.add_node("diversity_checker", diversity_checker)
    graph.add_node("digest_assembler", digest_assembler)

    # Linear pipeline
    graph.set_entry_point("fetcher")
    graph.add_edge("fetcher", "extractor")
    graph.add_edge("extractor", "quality_filter")
    graph.add_edge("quality_filter", "relevance_matcher")

    # Parallel fan-out after relevance_matcher
    graph.add_edge("relevance_matcher", "composer_dispatch")
    graph.add_edge("relevance_matcher", "research_agent")

    # Track 2 chain: research → compose → diversity check
    graph.add_edge("research_agent", "composer_essays")
    graph.add_edge("composer_essays", "diversity_checker")

    # Both tracks converge at assembler
    graph.add_edge("composer_dispatch", "digest_assembler")
    graph.add_edge("diversity_checker", "digest_assembler")

    graph.add_edge("digest_assembler", END)

    return graph


# Compiled graph singleton
digest_graph = build_digest_graph().compile()
