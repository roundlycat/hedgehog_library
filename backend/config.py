from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library"
    anthropic_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    num_shelves: int = 27

    @property
    def async_database_url(self) -> str:
        """Ensure the URL uses asyncpg for SQLAlchemy."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    model_config = {"env_file": ".env"}


settings = Settings()
