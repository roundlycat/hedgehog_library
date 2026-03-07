import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from database import get_db
from models import Book
from schemas import (BookCreate, BookUpdate, BookResponse, BookListResponse,
                     ShelfAssignRequest, ISBNLookupRequest, ImportResponse)
from services.embeddings import generate_book_embedding
from services.enrichment import lookup_isbn, enrich_book

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=BookListResponse)
async def list_books(
    shelf: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    q = select(Book)
    if shelf is not None:
        q = q.where(Book.shelf == shelf)
    if status:
        q = q.where(Book.reading_status == status)
    if search:
        pattern = f"%{search}%"
        q = q.where(Book.title.ilike(pattern) | Book.creators.ilike(pattern))
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()
    q = q.order_by(Book.title).offset(skip).limit(limit)
    result = await db.execute(q)
    books = result.scalars().all()
    return {"books": books, "total": total}


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("", response_model=BookResponse, status_code=201)
async def create_book(data: BookCreate, db: AsyncSession = Depends(get_db)):
    book = Book(**data.model_dump())
    embedding = await generate_book_embedding(
        book.title, book.creators, book.description,
        book.tags, book.time_period, book.philosophical_school
    )
    book.embedding = embedding
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book


@router.patch("/{book_id}", response_model=BookResponse)
async def update_book(book_id: int, data: BookUpdate, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    # Regenerate embedding if text fields changed
    embedding = await generate_book_embedding(
        book.title, book.creators, book.description,
        book.tags, book.time_period, book.philosophical_school
    )
    book.embedding = embedding
    await db.flush()
    await db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=204)
async def delete_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await db.delete(book)


@router.post("/{book_id}/shelf", response_model=BookResponse)
async def assign_shelf(book_id: int, data: ShelfAssignRequest, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if not 1 <= data.shelf <= 27:
        raise HTTPException(status_code=400, detail="Shelf must be between 1 and 27")
    book.shelf = data.shelf
    await db.flush()
    await db.refresh(book)
    return book


@router.post("/{book_id}/enrich", response_model=BookResponse)
async def enrich_book_endpoint(book_id: int, db: AsyncSession = Depends(get_db)):
    """Auto-enrich a book with Claude-generated tags, time period, and philosophical school."""
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    try:
        result = await enrich_book(book.title, book.creators, book.description)
        if result.get("tags"):
            book.tags = result["tags"]
        if result.get("time_period"):
            book.time_period = result["time_period"]
        if result.get("philosophical_school"):
            book.philosophical_school = result["philosophical_school"]
        if result.get("description") and not book.description:
            book.description = result["description"]
        if result.get("related_authors"):
            book.related_authors = result["related_authors"]
        book.enriched = True
        embedding = await generate_book_embedding(
            book.title, book.creators, book.description,
            book.tags, book.time_period, book.philosophical_school
        )
        book.embedding = embedding
        await db.flush()
        await db.refresh(book)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")
    return book


@router.post("/isbn-lookup")
async def isbn_lookup(data: ISBNLookupRequest, db: AsyncSession = Depends(get_db)):
    """Look up a book by ISBN via Open Library - used by manual add flow."""
    book_data = await lookup_isbn(data.isbn)
    if not book_data:
        raise HTTPException(status_code=404, detail="Book not found via ISBN lookup")
    return book_data


@router.post("/import/csv", response_model=ImportResponse)
async def import_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Import books from CSV. Skips existing ISBNs."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    for row in reader:
        try:
            isbn13 = row.get("ean_isbn13", "").strip()
            if isbn13:
                # Check for duplicate
                existing = await db.execute(select(Book).where(Book.isbn13 == isbn13))
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

            # Parse pages - handle floats like "544.0"
            pages_raw = row.get("length", "").strip()
            pages = None
            if pages_raw:
                try:
                    pages = int(float(pages_raw))
                except ValueError:
                    pass

            book = Book(
                title=row.get("title", "").strip() or "Unknown Title",
                creators=row.get("creators", "").strip() or None,
                first_name=row.get("first_name", "").strip() or None,
                last_name=row.get("last_name", "").strip() or None,
                isbn13=isbn13 or None,
                isbn10=row.get("upc_isbn10", "").strip() or None,
                description=row.get("description", "").strip() or None,
                publisher=row.get("publisher", "").strip() or None,
                publish_date=row.get("publish_date", "").strip() or None,
                pages=pages,
                tags=row.get("tags", "").strip() or None,
                notes=row.get("notes", "").strip() or None,
                reading_status=row.get("status", "").strip() or None,
                added=row.get("added", "").strip() or None,
            )

            # Skip generating embeddings during bulk import to avoid Render 512MB RAM OOM / timeouts.
            # Books will be marked as enriched=False, and the UI's Enrichment Panel will
            # stream them asynchronously, doing a db.commit() after each book.
            book.enriched = False
            db.add(book)
            imported += 1

        except Exception as e:
            errors.append(f"Row '{row.get('title', '?')}': {str(e)}")

    return {"imported": imported, "skipped": skipped, "errors": errors[:20]}
