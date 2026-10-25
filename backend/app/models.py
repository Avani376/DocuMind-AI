from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
def now(): return datetime.now(timezone.utc)
class User(Base):
    __tablename__="users"
    id: Mapped[int]=mapped_column(primary_key=True)
    email: Mapped[str]=mapped_column(String(255), unique=True, index=True)
    name: Mapped[str]=mapped_column(String(100), default="")
    password_hash: Mapped[str]=mapped_column(String(255))
    created_at: Mapped[datetime]=mapped_column(DateTime, default=now)
    chats: Mapped[list["Chat"]]=relationship(back_populates="owner", cascade="all, delete-orphan")
class Chat(Base):
    __tablename__="chats"
    id: Mapped[int]=mapped_column(primary_key=True)
    title: Mapped[str]=mapped_column(String(200), default="New chat")
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime]=mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime]=mapped_column(DateTime, default=now, onupdate=now)
    owner: Mapped[User]=relationship(back_populates="chats")
    messages: Mapped[list["Message"]]=relationship(back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")
    documents: Mapped[list["Document"]]=relationship(back_populates="chat", cascade="all, delete-orphan")
class Message(Base):
    __tablename__="messages"
    id: Mapped[int]=mapped_column(primary_key=True)
    chat_id: Mapped[int]=mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    role: Mapped[str]=mapped_column(String(20))
    content: Mapped[str]=mapped_column(Text)
    sources_json: Mapped[str]=mapped_column(Text, default="[]")
    created_at: Mapped[datetime]=mapped_column(DateTime, default=now)
    chat: Mapped[Chat]=relationship(back_populates="messages")
class Document(Base):
    __tablename__="documents"
    id: Mapped[int]=mapped_column(primary_key=True)
    chat_id: Mapped[int]=mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str]=mapped_column(String(255))
    stored_name: Mapped[str]=mapped_column(String(255))
    content_type: Mapped[str]=mapped_column(String(100))
    status: Mapped[str]=mapped_column(String(30), default="processing")
    error: Mapped[str|None]=mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime, default=now)
    chat: Mapped[Chat]=relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]]=relationship(back_populates="document", cascade="all, delete-orphan")
class DocumentChunk(Base):
    __tablename__="document_chunks"
    id: Mapped[int]=mapped_column(primary_key=True)
    document_id: Mapped[int]=mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int]=mapped_column(Integer)
    page_number: Mapped[int|None]=mapped_column(Integer, nullable=True)
    content: Mapped[str]=mapped_column(Text)
    document: Mapped[Document]=relationship(back_populates="chunks")
