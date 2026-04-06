"""Tests for the cosine similarity function."""

import math

from app.agents.nodes.relevance_matcher import _cosine_similarity


def test_identical_vectors():
    v = [1.0, 2.0, 3.0]
    assert math.isclose(_cosine_similarity(v, v), 1.0, abs_tol=1e-9)


def test_orthogonal_vectors():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert math.isclose(_cosine_similarity(a, b), 0.0, abs_tol=1e-9)


def test_opposite_vectors():
    a = [1.0, 0.0]
    b = [-1.0, 0.0]
    assert math.isclose(_cosine_similarity(a, b), -1.0, abs_tol=1e-9)


def test_zero_vector():
    a = [0.0, 0.0, 0.0]
    b = [1.0, 2.0, 3.0]
    assert _cosine_similarity(a, b) == 0.0


def test_known_value():
    a = [1.0, 2.0, 3.0]
    b = [4.0, 5.0, 6.0]
    # Manual: dot=32, |a|=sqrt(14), |b|=sqrt(77)
    expected = 32 / (math.sqrt(14) * math.sqrt(77))
    assert math.isclose(_cosine_similarity(a, b), expected, abs_tol=1e-9)
