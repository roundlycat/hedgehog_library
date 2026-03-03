import asyncio
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from config import settings


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


def make_book_text(title: str, creators: str | None, description: str | None,
                   tags: str | None, time_period: str | None,
                   philosophical_school: str | None) -> str:
    """Compose the text we embed for a book - richer text = better semantic search."""
    parts = [f"Title: {title}"]
    if creators:
        parts.append(f"Author: {creators}")
    if description:
        parts.append(f"Description: {description[:500]}")
    if tags:
        parts.append(f"Topics: {tags}")
    if time_period:
        parts.append(f"Period: {time_period}")
    if philosophical_school:
        parts.append(f"School: {philosophical_school}")
    return " | ".join(parts)


async def generate_embedding(text: str) -> list[float]:
    loop = asyncio.get_event_loop()
    model = get_model()
    embedding = await loop.run_in_executor(None, lambda: model.encode(text).tolist())
    return embedding


async def generate_book_embedding(title: str, creators: str | None = None,
                                   description: str | None = None,
                                   tags: str | None = None,
                                   time_period: str | None = None,
                                   philosophical_school: str | None = None) -> list[float]:
    text = make_book_text(title, creators, description, tags, time_period, philosophical_school)
    return await generate_embedding(text)
