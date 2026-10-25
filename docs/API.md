# API notes

Upload uses multipart form field `file` and returns once the file is stored. Poll `GET /api/documents/{id}/status` until the status is `ready` before asking questions about that document. Use `POST /api/documents/{id}/retry` to retry a failed processing job.

Document processing runs as an in-process FastAPI background task, not a durable job queue. If the backend is stopped while processing, a document may remain in `processing`; use a durable worker queue for deployments that need restart-safe processing.

All routes except `/health` and register/login require `Authorization: Bearer <token>`. Register/login return `{access_token, token_type, user}`. Chat and document resources are scoped to the authenticated user. Upload uses multipart form field `file`. Message creation accepts `{ "content": "..." }` and returns user and assistant messages; assistant messages include `sources[]` with document ID, filename, page number, chunk ID and excerpt. FastAPI's interactive schema is served at `/docs`.
