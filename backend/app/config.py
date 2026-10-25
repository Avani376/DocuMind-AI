from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")
    secret_key: str = "development-only-change-this-secret-key-please"
    database_url: str = "sqlite:///./documind.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 20
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    retrieval_top_k: int = 5
    chunk_size: int = 800
    chunk_overlap: int = 120
    ocr_enabled: bool = False
    @property
    def cors_list(self):
        origins = [x.strip() for x in self.cors_origins.split(",") if x.strip()]
        vite_origins = ("http://localhost:5173", "http://127.0.0.1:5173")
        if any(origin in origins for origin in vite_origins):
            origins.extend(origin for origin in vite_origins if origin not in origins)
        return origins
    @property
    def upload_path(self):
        p=Path(self.upload_dir); p.mkdir(parents=True, exist_ok=True); return p

@lru_cache
def get_settings(): return Settings()
