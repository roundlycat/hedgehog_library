import json
import anthropic
from config import settings

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


ENRICHMENT_PROMPT = """You are a librarian assistant. Given a book's title, author, and optional existing description,
return a JSON object with enriched metadata. Be concise but informative.

Book:
Title: {title}
Author: {creators}
Existing description: {description}

Return ONLY valid JSON with these fields:
{{
  "description": "2-3 sentence description of the book's content and significance (keep existing if good, improve if sparse)",
  "tags": "comma-separated subject tags (5-8 tags, lowercase, e.g.: philosophy, phenomenology, consciousness, 20th century)",
  "related_authors": "comma-separated names of 3-5 related authors the reader might also enjoy",
  "time_period": "historical period covered or when written (e.g.: Ancient Greece, 17th century, Modern)",
  "philosophical_school": "school of thought if applicable (e.g.: Continental, Analytic, Phenomenology, Existentialism, Stoicism)"
}}

For non-philosophy books, use appropriate subject categories instead of philosophical_school (e.g.: Fiction, Mathematics, History).
Return ONLY the JSON object, no other text."""


async def enrich_book(title: str, creators: str | None,
                      description: str | None) -> dict:
    """Call Claude to enrich a single book. Returns dict of enriched fields."""
    client = get_client()

    prompt = ENRICHMENT_PROMPT.format(
        title=title,
        creators=creators or "Unknown",
        description=description or "Not provided"
    )

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # Fast and cheap for bulk enrichment
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    result = json.loads(text)
    return result


async def lookup_isbn(isbn: str) -> dict | None:
    """Look up a book by ISBN via Open Library API (free, no key required)."""
    import httpx
    isbn_clean = isbn.replace("-", "").replace(" ", "")
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_clean}&format=json&jscmd=data"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        data = resp.json()
        key = f"ISBN:{isbn_clean}"
        if key not in data:
            return None
        book_data = data[key]
        return {
            "title": book_data.get("title"),
            "creators": ", ".join(a["name"] for a in book_data.get("authors", [])),
            "publisher": ", ".join(p["name"] for p in book_data.get("publishers", [])),
            "publish_date": book_data.get("publish_date"),
            "pages": book_data.get("number_of_pages"),
            "description": book_data.get("notes") or book_data.get("subtitle"),
        }
