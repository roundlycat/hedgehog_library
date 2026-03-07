from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import init_db, engine
from routers import books, search, enrichment, shelves, whispers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure pgvector extension and tables exist
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    await init_db()
    yield


app = FastAPI(
    title="Hedgehog Library API",
    description="Personal library catalog with semantic search",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down to your local network IPs in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(search.router)
app.include_router(enrichment.router)
app.include_router(shelves.router)
app.include_router(whispers.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hedgehog-library"}
