"""Application settings loaded from environment variables."""
# Manages all config via .env file using pydantic-settings.
# Supports three LLM providers: openai, deepseek, groq.
# Updated: 2026-04-01
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    openai_api_key: str = Field("", alias="OPENAI_API_KEY")
    deepseek_api_key: str = Field("", alias="DEEPSEEK_API_KEY")
    groq_api_key: str = Field("", alias="GROQ_API_KEY")
    llm_provider: str = Field("groq", alias="LLM_PROVIDER")     # "openai" | "deepseek" | "groq"
    llm_model: str = Field("openai/gpt-oss-120b", alias="LLM_MODEL")
    embedding_model: str = Field("BAAI/bge-small-en-v1.5", alias="EMBEDDING_MODEL")

    # GitHub
    github_token: str = Field("", alias="GITHUB_TOKEN")
    github_webhook_secret: str = Field("", alias="GITHUB_WEBHOOK_SECRET")

    # ChromaDB
    chroma_host: str = Field("localhost", alias="CHROMA_HOST")
    chroma_port: int = Field(8001, alias="CHROMA_PORT")

    # App
    app_host: str = Field("0.0.0.0", alias="APP_HOST")
    app_port: int = Field(8000, alias="APP_PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    @property
    def chroma_url(self) -> str:
        return f"http://{self.chroma_host}:{self.chroma_port}"

    @property
    def effective_api_key(self) -> str:
        if self.llm_provider == "deepseek":
            return self.deepseek_api_key
        if self.llm_provider == "groq":
            return self.groq_api_key
        return self.openai_api_key

    @property
    def effective_base_url(self) -> str | None:
        if self.llm_provider == "deepseek":
            return "https://api.deepseek.com/v1"
        if self.llm_provider == "groq":
            return "https://api.groq.com/openai/v1"
        return None


settings = Settings()
