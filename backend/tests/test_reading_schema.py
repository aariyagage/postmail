"""Tests for reading endpoint schema validation."""

import uuid

import pytest
from pydantic import ValidationError

from app.routers.reading import MarkReadRequest


def test_valid_essay_content_type():
    req = MarkReadRequest(content_type="essay", content_id=uuid.uuid4())
    assert req.content_type == "essay"


def test_valid_article_content_type():
    req = MarkReadRequest(content_type="article", content_id=uuid.uuid4())
    assert req.content_type == "article"


def test_invalid_content_type_rejected():
    with pytest.raises(ValidationError):
        MarkReadRequest(content_type="invalid", content_id=uuid.uuid4())


def test_default_progress():
    req = MarkReadRequest(content_type="essay", content_id=uuid.uuid4())
    assert req.progress == 100
