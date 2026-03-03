import asyncio
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import AsyncIterator

from database import get_db, AsyncSessionLocal
from models import Book
from schemas import EnrichRequest
from services.enrichment import enrich_book
from services.embeddings import generate_book_embedding

router = APIRouter(prefix="/api/enrich", tags=["enrichment"])


async def _enrich_stream(book_ids: list[int] | None, force: bool) -> AsyncIterator[str]:
    """Generator that enriches books and streams SSE progress events."""
    async with AsyncSessionLocal() as db:
        if book_ids:
            q = select(Book).where(Book.id.in_(book_ids))
        elif force:
            q = select(Book)
        else:
            q = select(Book).where(Book.enriched == False)

        result = await db.execute(q)
        books = result.scalars().all()

        total = len(books)
        yield f"data: {json.dumps({'type': 'start', 'total': total})}\n\n"

        for i, book in enumerate(books):
            # Capture these BEFORE any try/except - after rollback the ORM
            # object expires and accessing attributes causes a MissingGreenlet crash
            book_id = book.id
            book_title = book.title
            book_creators = book.creators
            book_description = book.description

            try:
                enriched = await enrich_book(book_title, book_creators, book_description)

                # Update fields (don't override existing description if we have one)
                if enriched.get("description") and not book_description:
                    book.description = enriched["description"]
                if enriched.get("tags"):
                    book.tags = enriched["tags"]
                if enriched.get("related_authors"):
                    book.related_authors = enriched["related_authors"]
                if enriched.get("time_period"):
                    book.time_period = enriched["time_period"]
                if enriched.get("philosophical_school"):
                    book.philosophical_school = enriched["philosophical_school"]

                book.enriched = True

                # Regenerate embedding with richer text
                embedding = await generate_book_embedding(
                    book.title, book.creators, book.description,
                    book.tags, book.time_period, book.philosophical_school
                )
                book.embedding = embedding

                await db.commit()

                yield f"data: {json.dumps({'type': 'progress', 'index': i+1, 'total': total, 'book_id': book_id, 'title': book_title, 'status': 'ok'})}\n\n"

            except Exception as e:
                await db.rollback()
                err_msg = str(e)
                # Surface credit errors clearly
                if "credit balance" in err_msg.lower():
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Anthropic API credits exhausted — top up at console.anthropic.com'})}\n\n"
                    return
                yield f"data: {json.dumps({'type': 'progress', 'index': i+1, 'total': total, 'book_id': book_id, 'title': book_title, 'status': 'error', 'message': err_msg})}\n\n"

            # Small delay to avoid hammering the API
            await asyncio.sleep(0.2)

        yield f"data: {json.dumps({'type': 'done', 'total': total})}\n\n"


@router.post("/stream")
async def enrich_stream(data: EnrichRequest):
    """Server-sent events stream of enrichment progress."""
    return StreamingResponse(
        _enrich_stream(data.book_ids, data.force),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/status")
async def enrichment_status(db: AsyncSession = Depends(get_db)):
    """How many books need enrichment."""
    from sqlalchemy import func
    total = (await db.execute(select(func.count(Book.id)))).scalar()
    enriched = (await db.execute(select(func.count(Book.id)).where(Book.enriched == True))).scalar()
    return {"total": total, "enriched": enriched, "pending": total - enriched}
