import pytest
pytest.importorskip("jose")
pytest.importorskip("pwdlib")
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.config import Settings
from app.api import documents as document_api
from app.main import app, ensure_user_name_column


def test_cors_list_adds_only_vite_localhost_alias():
    settings = Settings(cors_origins="http://localhost:5173")
    assert set(settings.cors_list) == {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }


def test_vite_origins_allow_login_preflight():
    with TestClient(app) as client:
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
            response = client.options(
                "/api/auth/login",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
            )
            assert response.status_code == 200
            assert response.headers["access-control-allow-origin"] == origin
            assert "POST" in response.headers["access-control-allow-methods"]
            allowed_headers = response.headers["access-control-allow-headers"].lower()
            assert "authorization" in allowed_headers
            assert "content-type" in allowed_headers
            assert "access-control-allow-credentials" not in response.headers


def test_user_name_column_migrates_existing_users(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255), password_hash VARCHAR(255))"
        ))
        connection.execute(text(
            "INSERT INTO users (id, email, password_hash) VALUES (1, 'legacy@example.com', 'hash')"
        ))

    ensure_user_name_column(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    assert "name" in columns
    with engine.connect() as connection:
        assert connection.execute(text("SELECT name FROM users WHERE id = 1")).scalar_one() == ""
    engine.dispose()


def test_auth_chat_and_owner_isolation(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            assert client.get("/api/chats").status_code == 401
            assert client.get("/api/auth/me").status_code == 401
            first = client.post("/api/auth/register", json={"name": "First User", "email": "one@example.com", "password": "correct-horse-1"})
            assert first.status_code == 200
            token1 = first.json()["access_token"]
            assert first.json()["user"]["name"] == "First User"
            assert client.post("/api/auth/register", json={"email": "one@example.com", "password": "correct-horse-1"}).status_code == 409
            assert client.post("/api/auth/login", json={"email": "one@example.com", "password": "wrong-password"}).status_code == 401
            login = client.post("/api/auth/login", json={"email": "one@example.com", "password": "correct-horse-1"})
            assert login.status_code == 200
            assert login.json()["user"]["email"] == "one@example.com"
            auth1 = {"Authorization": f"Bearer {token1}"}
            chat = client.post("/api/chats", headers=auth1, json={}).json()
            assert chat["title"] == "New chat"
            second = client.post("/api/auth/register", json={"email": "two@example.com", "password": "correct-horse-2"})
            auth2 = {"Authorization": f"Bearer {second.json()['access_token']}"}
            assert client.get(f"/api/chats/{chat['id']}", headers=auth2).status_code == 404
            assert client.patch(f"/api/chats/{chat['id']}", headers=auth1, json={"title": "Renamed"}).json()["title"] == "Renamed"
            assert client.get("/api/chats", headers=auth1).json()[0]["title"] == "Renamed"
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_upload_processing_status_and_retry(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'upload.db'}",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(document_api, "SessionLocal", TestingSession)
    attempts = 0

    def parse_document(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise ValueError("Temporary processing failure")
        return [(None, "Document text to index.")]

    monkeypatch.setattr(document_api, "parse_document", parse_document)
    monkeypatch.setattr(
        document_api.Retriever, "index_chunks", lambda *args, **kwargs: None
    )
    monkeypatch.setattr(document_api.settings, "upload_dir", str(tmp_path / "uploads"))
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            registered = client.post(
                "/api/auth/register",
                json={
                    "name": "Upload Tester",
                    "email": "upload@example.com",
                    "password": "correct-horse-3",
                },
            )
            headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
            chat = client.post("/api/chats", headers=headers, json={}).json()
            uploaded = client.post(
                f"/api/chats/{chat['id']}/documents",
                headers=headers,
                files={"file": ("notes.txt", b"document text", "text/plain")},
            )
            assert uploaded.status_code == 200
            assert uploaded.json()["status"] == "processing"
            document_id = uploaded.json()["id"]
            failed = client.get(
                f"/api/documents/{document_id}/status", headers=headers
            ).json()
            assert failed["status"] == "failed"
            assert failed["error"] == "Temporary processing failure"

            retry = client.post(
                f"/api/documents/{document_id}/retry", headers=headers
            )
            assert retry.status_code == 200
            ready = client.get(
                f"/api/documents/{document_id}/status", headers=headers
            ).json()
            assert ready["status"] == "ready"
            assert ready["error"] is None
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
