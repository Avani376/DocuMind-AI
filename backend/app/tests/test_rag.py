import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app.models import Chat, User
from app.services.rag_service import RAGService


class EmptyRetriever:
    def retrieve(self, *args):
        raise AssertionError("Retrieval should be skipped without ready documents")


class GeneralLLM:
    def answer(self, question, contexts):
        assert question == "What is photosynthesis?"
        assert contexts == []
        return "Photosynthesis is how plants convert light into chemical energy."


def test_rag_answers_general_question_without_documents():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            user = User(email="test@example.com", name="Test", password_hash="hash")
            chat = Chat(title="General questions", owner=user)
            db.add(chat)
            db.commit()
            db.refresh(chat)

            service = RAGService.__new__(RAGService)
            service.retriever = EmptyRetriever()
            service.llm = GeneralLLM()
            answer, sources = service.ask(db, user.id, chat.id, "What is photosynthesis?")

        assert "plants" in answer
        assert sources == []
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_llm_answers_general_questions_without_document_excerpts():
    from types import SimpleNamespace
    from unittest.mock import patch
    from app.services.llm_service import LLMService

    captured = {}
    class ProviderError(Exception):
        pass

    class FakeOpenAI:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    captured.update(kwargs)
                    return SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(content="A general answer.")
                            )
                        ]
                    )

    settings = SimpleNamespace(
        openai_api_key="test-key",
        openai_base_url="",
        openai_model="test-model",
    )
    openai_stub = SimpleNamespace(
        OpenAI=FakeOpenAI,
        APIConnectionError=ProviderError,
        APIStatusError=ProviderError,
        AuthenticationError=ProviderError,
        BadRequestError=ProviderError,
        NotFoundError=ProviderError,
        PermissionDeniedError=ProviderError,
        RateLimitError=ProviderError,
    )
    with patch.dict("sys.modules", {"openai": openai_stub}):
        answer = LLMService(settings).answer("What is photosynthesis?", [])

    assert answer == "A general answer."
    assert "general knowledge questions normally" in captured["messages"][0]["content"]
    assert "What is photosynthesis?" in captured["messages"][1]["content"]
    assert "No relevant document excerpts" in captured["messages"][1]["content"]


def test_llm_reports_provider_authentication_failures():
    from types import SimpleNamespace
    from unittest.mock import patch
    from app.services.llm_service import LLMService

    class ProviderAuthenticationError(Exception):
        pass

    class FakeOpenAI:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise ProviderAuthenticationError()

    openai_stub = SimpleNamespace(
        OpenAI=FakeOpenAI,
        APIConnectionError=Exception,
        APIStatusError=Exception,
        AuthenticationError=ProviderAuthenticationError,
        BadRequestError=Exception,
        NotFoundError=Exception,
        PermissionDeniedError=Exception,
        RateLimitError=Exception,
    )
    settings = SimpleNamespace(
        openai_api_key="test-key",
        openai_base_url="",
        openai_model="test-model",
    )

    with patch.dict("sys.modules", {"openai": openai_stub}):
        with pytest.raises(RuntimeError, match="authentication failed"):
            LLMService(settings).answer("Test question", [])
