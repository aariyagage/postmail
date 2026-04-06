"""Tests for Pydantic schema validation."""

import pytest
from pydantic import ValidationError

from app.schemas.user import InterestCreate, UserCreate, MAX_INTERESTS


class TestInterestCreate:
    def test_valid_topic(self):
        i = InterestCreate(topic="Philosophy")
        assert i.topic == "Philosophy"

    def test_empty_topic_rejected(self):
        with pytest.raises(ValueError, match="empty"):
            InterestCreate(topic="   ")

    def test_long_topic_rejected(self):
        with pytest.raises(ValueError, match="100 characters"):
            InterestCreate(topic="x" * 101)

    def test_topic_stripped(self):
        i = InterestCreate(topic="  Physics  ")
        assert i.topic == "Physics"


class TestUserCreate:
    def test_valid_user(self):
        u = UserCreate(
            email="test@example.com",
            name="Test",
            interests=[InterestCreate(topic="AI")],
        )
        assert u.name == "Test"

    def test_too_many_interests_rejected(self):
        interests = [InterestCreate(topic=f"Topic {i}") for i in range(MAX_INTERESTS + 1)]
        with pytest.raises(ValidationError, match="Maximum"):
            UserCreate(email="test@example.com", name="Test", interests=interests)

    def test_max_interests_allowed(self):
        interests = [InterestCreate(topic=f"Topic {i}") for i in range(MAX_INTERESTS)]
        u = UserCreate(email="test@example.com", name="Test", interests=interests)
        assert len(u.interests) == MAX_INTERESTS
