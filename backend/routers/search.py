from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional

from database import get_db
from models import Book
from schemas import SearchResponse, SearchResult, BookResponse
from services.embeddings import generate_embedding

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def semantic_search(
    q: str = Query(..., description="Natural language search query"),
    limit: int = Query(10, le=50),
    shelf: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Semantic search using cosine similarity against book embeddings."""
    query_embedding = await generate_embedding(q)

    # Build query - cosine distance, lower = more similar
    # We use 1 - cosine_distance as the score
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    if shelf is not None:
        sql = text("""
            SELECT id, 1 - (embedding <=> :embedding::vector) AS score
            FROM books
            WHERE embedding IS NOT NULL AND shelf = :shelf
            ORDER BY embedding <=> :embedding::vector
            LIMIT :limit
        """)
        rows = (await db.execute(sql, {
            "embedding": embedding_str, "shelf": shelf, "limit": limit
        })).fetchall()
    else:
        sql = text("""
            SELECT id, 1 - (embedding <=> :embedding::vector) AS score
            FROM books
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> :embedding::vector
            LIMIT :limit
        """)
        rows = (await db.execute(sql, {
            "embedding": embedding_str, "limit": limit
        })).fetchall()

    results = []
    for row in rows:
        book = await db.get(Book, row.id)
        if book:
            results.append(SearchResult(book=BookResponse.model_validate(book), score=round(row.score, 4)))

    return SearchResponse(results=results, query=q)
