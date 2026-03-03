from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import Book
from schemas import BookResponse
from config import settings

router = APIRouter(prefix="/api/shelves", tags=["shelves"])


@router.get("")
async def list_shelves(db: AsyncSession = Depends(get_db)):
    """Return all shelves with their book counts."""
    rows = (await db.execute(
        select(Book.shelf, func.count(Book.id).label("count"))
        .where(Book.shelf.isnot(None))
        .group_by(Book.shelf)
        .order_by(Book.shelf)
    )).fetchall()

    shelf_map = {row.shelf: row.count for row in rows}
    unassigned = (await db.execute(
        select(func.count(Book.id)).where(Book.shelf.is_(None))
    )).scalar()

    return {
        "shelves": [
            {"shelf": i, "count": shelf_map.get(i, 0)}
            for i in range(1, settings.num_shelves + 1)
        ],
        "unassigned": unassigned
    }


@router.get("/{shelf_number}", response_model=list[BookResponse])
async def get_shelf(shelf_number: int, db: AsyncSession = Depends(get_db)):
    """Get all books on a specific shelf."""
    result = await db.execute(
        select(Book).where(Book.shelf == shelf_number).order_by(Book.title)
    )
    return result.scalars().all()


@router.get("/unassigned/list", response_model=list[BookResponse])
async def get_unassigned(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Book).where(Book.shelf.is_(None)).order_by(Book.title)
    )
    return result.scalars().all()
