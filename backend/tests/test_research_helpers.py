"""Tests for research agent helper functions."""

from app.agents.nodes.research_agent import _normalize_concept, _deduplicate_topics


class TestNormalizeConcept:
    def test_basic(self):
        assert _normalize_concept("Existentialism") == "existentialism"

    def test_strips_the(self):
        assert _normalize_concept("The Trolley Problem") == "trolley problem"

    def test_strips_concept_of(self):
        assert _normalize_concept("The Concept of 'Sonder'") == "sonder"

    def test_strips_articles(self):
        assert _normalize_concept("A Brief History") == "brief history"
        assert _normalize_concept("An Overview") == "overview"

    def test_strips_quotes(self):
        assert _normalize_concept("'Qualia'") == "qualia"
        assert _normalize_concept('"Free Will"') == "free will"

    def test_preserves_interior_content(self):
        assert _normalize_concept("machine learning") == "machine learning"

    def test_whitespace(self):
        assert _normalize_concept("  emergence  ") == "emergence"


class TestDeduplicateTopics:
    def _make_topic(self, concept: str) -> tuple[str, dict]:
        return ("interest", {"concept": concept})

    def test_no_duplicates(self):
        topics = [
            self._make_topic("Quantum Entanglement"),
            self._make_topic("Natural Selection"),
            self._make_topic("Game Theory"),
        ]
        result = _deduplicate_topics(topics)
        assert len(result) == 3

    def test_substring_dedup(self):
        """'Sonder' should be deduped against 'The Concept of Sonder'."""
        topics = [
            self._make_topic("The Concept of 'Sonder'"),
            self._make_topic("Sonder"),
        ]
        result = _deduplicate_topics(topics)
        assert len(result) == 1

    def test_empty_concept_skipped(self):
        topics = [
            ("interest", {"concept": ""}),
            self._make_topic("Valid Topic"),
        ]
        result = _deduplicate_topics(topics)
        assert len(result) == 1
        assert result[0][1]["concept"] == "Valid Topic"

    def test_word_overlap_dedup(self):
        """Topics with >50% word overlap get deduped."""
        topics = [
            self._make_topic("cognitive behavioral therapy"),
            self._make_topic("cognitive behavioral approaches"),
        ]
        result = _deduplicate_topics(topics)
        # "cognitive behavioral" overlaps 2/3 words = 66% > 50%
        assert len(result) == 1

    def test_low_word_overlap_preserved(self):
        """Topics with low word overlap are kept."""
        topics = [
            self._make_topic("quantum mechanics"),
            self._make_topic("classical mechanics"),
        ]
        result = _deduplicate_topics(topics)
        # "mechanics" overlaps 1/2 = 50%, which is NOT > 0.5
        assert len(result) == 2
