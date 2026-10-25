# Architecture

React/Vite client authenticates to FastAPI with an eight-hour bearer JWT. FastAPI validates the token and checks ownership for every chat/document operation. SQLAlchemy persists users, chats, messages, document metadata and chunk text in SQLite.

Upload flow: validate extension and byte size -> store a UUID-named file -> extract text and location metadata -> split into overlapping chunks -> save chunk rows -> lazily load Sentence Transformers -> normalize vectors -> add IDs to a persisted per-user FAISS index -> mark the document ready. Query flow: embed question -> search only the requesting user's FAISS index -> resolve result IDs through SQLite with user and ready-document filters -> send retrieved excerpts to configured chat-completion provider -> return answer plus the exact retrieved chunk source metadata.

FAISS is a nearest-neighbor accelerator; SQLite remains the authority for ownership and source metadata. A stale FAISS ID cannot bypass the SQLite filters. Deleting a document leaves possible stale vector IDs until index maintenance; those IDs are filtered out at retrieval. A future reindex command should compact indexes after deletions.

The 3D orb uses React Three Fiber and a small procedural scene. Splash is a three-second overlay; CSS honors reduced-motion preferences.
