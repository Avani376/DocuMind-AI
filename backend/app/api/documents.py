import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from ..config import get_settings
from ..database import SessionLocal, get_db
from ..deps import current_user
from ..models import Chat, Document, DocumentChunk, User
from ..schemas import DocumentOut
from ..services.chunking import chunk_pages
from ..services.document_parser import parse_document
from ..services.retrieval import Retriever

logger = logging.getLogger(__name__)
router = APIRouter(tags=["documents"])
settings = get_settings()
ALLOWED = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp"}


def owned_chat(db,user,chat_id):
    c=db.query(Chat).filter(Chat.id==chat_id,Chat.user_id==user.id).first()
    if not c: raise HTTPException(404,"Chat not found")
    return c


def process_document(document_id: int, user_id: int, chat_id: int, path: Path, suffix: str):
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id,
        ).first()
        if not doc:
            logger.error("Document %s disappeared before processing", document_id)
            return

        db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).delete(synchronize_session=False)
        db.commit()

        pages = parse_document(path, suffix, settings.ocr_enabled)
        pieces = chunk_pages(pages, settings.chunk_size, settings.chunk_overlap)
        if not pieces:
            raise ValueError("No text could be extracted")
        for piece in pieces:
            db.add(DocumentChunk(document_id=document_id, user_id=user_id, **piece))
        db.commit()
        chunks = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).all()
        Retriever(settings).index_chunks(db, user_id, chat_id, chunks)

        doc.status = "ready"
        doc.error = None
        db.commit()
    except Exception as exc:
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            doc.error = str(exc)[:500]
            db.commit()
        logger.exception("Document processing failed for document %s", document_id)
    finally:
        db.close()


@router.post("/api/chats/{chat_id}/documents",response_model=DocumentOut)
async def upload(chat_id:int,background_tasks:BackgroundTasks,file:UploadFile=File(...),db:Session=Depends(get_db),user:User=Depends(current_user)):
    owned_chat(db,user,chat_id); suffix=Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED: raise HTTPException(415,"Unsupported file type")
    raw=await file.read(settings.max_upload_mb*1024*1024+1)
    if len(raw)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File exceeds upload size limit")
    stored=f"{uuid4().hex}{suffix}"; path=settings.upload_path/stored; path.write_bytes(raw)
    doc=Document(chat_id=chat_id,user_id=user.id,filename=Path(file.filename or "document").name,stored_name=stored,content_type=file.content_type or "application/octet-stream",status="processing"); db.add(doc); db.commit(); db.refresh(doc)
    background_tasks.add_task(
        process_document, doc.id, user.id, chat_id, path, suffix
    )
    return doc


@router.post("/api/documents/{document_id}/retry", response_model=DocumentOut)
def retry_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user.id,
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.status != "failed":
        raise HTTPException(409, "Only failed documents can be retried")

    path = settings.upload_path / doc.stored_name
    if not path.is_file():
        raise HTTPException(404, "The uploaded file is no longer available")
    suffix = path.suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(415, "Unsupported file type")

    doc.status = "processing"
    doc.error = None
    db.commit()
    db.refresh(doc)
    background_tasks.add_task(
        process_document, doc.id, user.id, doc.chat_id, path, suffix
    )
    return doc


@router.get("/api/chats/{chat_id}/documents",response_model=list[DocumentOut])
def list_docs(chat_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    owned_chat(db,user,chat_id); return db.query(Document).filter(Document.chat_id==chat_id,Document.user_id==user.id).order_by(Document.created_at.desc()).all()
@router.get("/api/documents/{document_id}/status",response_model=DocumentOut)
def status(document_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    d=db.query(Document).filter(Document.id==document_id,Document.user_id==user.id).first()
    if not d: raise HTTPException(404,"Document not found")
    return d
@router.delete("/api/documents/{document_id}")
def delete_document(document_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    d=db.query(Document).filter(Document.id==document_id,Document.user_id==user.id).first()
    if not d: raise HTTPException(404,"Document not found")
    (settings.upload_path/d.stored_name).unlink(missing_ok=True); db.delete(d); db.commit()
    # Per-user FAISS index may contain stale IDs; retrieval filters against SQLite. Rebuild on next maintenance/reindex.
    return {"ok":True}
