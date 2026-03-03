from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library"
    anthropic_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    num_shelves: int = 27

    model_config = {"env_file": ".env"}


settings = Settings()
