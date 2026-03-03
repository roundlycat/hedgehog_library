from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Date, DateTime, Boolean, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    creators: Mapped[Optional[str]] = mapped_column(String(500))
    first_name: Mapped[Optional[str]] = mapped_column(String(200))
    last_name: Mapped[Optional[str]] = mapped_column(String(200))
    isbn13: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    isbn10: Mapped[Optional[str]] = mapped_column(String(20))
    description: Mapped[Optional[str]] = mapped_column(Text)
    publisher: Mapped[Optional[str]] = mapped_column(String(200))
    publish_date: Mapped[Optional[str]] = mapped_column(String(50))
    pages: Mapped[Optional[int]] = mapped_column(Integer)
    tags: Mapped[Optional[str]] = mapped_column(Text)          # comma-separated
    related_authors: Mapped[Optional[str]] = mapped_column(Text)
    time_period: Mapped[Optional[str]] = mapped_column(String(200))
    philosophical_school: Mapped[Optional[str]] = mapped_column(String(200))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    shelf: Mapped[Optional[int]] = mapped_column(Integer)      # 1-27
    reading_status: Mapped[Optional[str]] = mapped_column(String(50))  # unread/reading/read
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    enriched: Mapped[bool] = mapped_column(Boolean, default=False)
    embedding: Mapped[Optional[list]] = mapped_column(Vector(384))
    added: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("books_embedding_idx", "embedding", postgresql_using="hnsw",
              postgresql_with={"m": 16, "ef_construction": 64},
              postgresql_ops={"embedding": "vector_cosine_ops"}),
    )
