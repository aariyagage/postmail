import uuid

from pydantic import BaseModel, EmailStr, field_validator


class InterestCreate(BaseModel):
    topic: str
    description: str | None = None

    @classmethod
    def validate_topic(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Topic cannot be empty")
        if len(v) > 100:
            raise ValueError("Topic must be 100 characters or fewer")
        return v

    def model_post_init(self, __context) -> None:
        self.topic = self.validate_topic(self.topic)


class InterestRead(BaseModel):
    id: uuid.UUID
    topic: str
    description: str | None = None

    model_config = {"from_attributes": True}


MAX_INTERESTS = 10


class UserCreate(BaseModel):
    name: str
    interests: list[InterestCreate] = []

    @field_validator("interests")
    @classmethod
    def cap_interests(cls, v: list[InterestCreate]) -> list[InterestCreate]:
        if len(v) > MAX_INTERESTS:
            raise ValueError(f"Maximum {MAX_INTERESTS} interests allowed")
        return v


class UserRead(BaseModel):
    id: uuid.UUID
    supabase_id: str | None = None
    email: str
    name: str
    onboarding_complete: bool
    interests: list[InterestRead] = []

    model_config = {"from_attributes": True}
