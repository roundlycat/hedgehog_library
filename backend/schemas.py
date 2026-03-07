from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class WhisperCreate(BaseModel):
    agent: str
    text: str
    triggered_by: Optional[str] = None

class WhisperResponse(BaseModel):
    id: int
    agent: str
    text: str
    triggered_by: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}



class BookBase(BaseModel):
    title: str
    creators: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    isbn13: Optional[str] = None
    isbn10: Optional[str] = None
    description: Optional[str] = None
    publisher: Optional[str] = None
    publish_date: Optional[str] = None
    pages: Optional[int] = None
    tags: Optional[str] = None
    related_authors: Optional[str] = None
    time_period: Optional[str] = None
    philosophical_school: Optional[str] = None
    notes: Optional[str] = None
    shelf: Optional[int] = None
    reading_status: Optional[str] = None
    rating: Optional[int] = None
    source_type: Optional[str] = None
    recommended_by: Optional[str] = None


class BookCreate(BookBase):
    pass


class BookUpdate(BookBase):
    title: Optional[str] = None


class BookResponse(BookBase):
    id: int
    enriched: bool
    added: Optional[str] = None

    model_config = {"from_attributes": True}


class BookListResponse(BaseModel):
    books: list[BookResponse]
    total: int


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    shelf: Optional[int] = None


class SearchResult(BaseModel):
    book: BookResponse
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str


class EnrichRequest(BaseModel):
    book_ids: Optional[list[int]] = None   # None = enrich all un-enriched
    force: bool = False


class EnrichProgress(BaseModel):
    book_id: int
    title: str
    status: str
    message: Optional[str] = None


class ISBNLookupRequest(BaseModel):
    isbn: str


class ShelfAssignRequest(BaseModel):
    shelf: int


class ImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
