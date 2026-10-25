from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from .config import get_settings
from .database import Base,engine
from .api import auth,chats,messages,documents

def ensure_user_name_column(target_engine: Engine) -> None:
    columns = {column["name"] for column in inspect(target_engine).get_columns("users")}
    if "name" not in columns:
        with target_engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT ''")
            )


settings=get_settings(); Base.metadata.create_all(bind=engine)
ensure_user_name_column(engine)
app=FastAPI(title="DocuMind AI API",version="1.0.0",description="Document-grounded AI chat with citations")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router); app.include_router(chats.router); app.include_router(messages.router); app.include_router(documents.router)
@app.get("/health")
def health(): return {"status":"ok","service":"documind-ai"}
