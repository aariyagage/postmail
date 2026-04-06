from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postmail:postmail@localhost:5432/postmail"
    groq_api_key: str = ""
    youtube_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "all-MiniLM-L6-v2"
    digest_cron_hour: int = 6
    digest_cron_minute: int = 0
    cors_origins: list[str] = ["http://localhost:3000"]
    supabase_jwt_secret: str = ""  # HS256 secret (legacy) — leave empty if using JWKS
    supabase_url: str = ""  # e.g. https://xyz.supabase.co — used to fetch JWKS for ES256

    model_config = {"env_file": ".env", "env_prefix": "POSTMAIL_"}


settings = Settings()
