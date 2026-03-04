#!/usr/bin/env python3
"""
Hedgehog Library MCP Server

Exposes Sean's personal library (200+ books across 27 shelves) to Claude via
the Model Context Protocol. Claude can answer questions like:
  - "What's on shelf 12?"
  - "Find me something on phenomenology"
  - "What books have I not read yet in the analytic tradition?"
  - "Show me my reading stats"
  - "Rate Being and Time 5 stars"

Usage with Claude Desktop — add to claude_desktop_config.json:
  {
    "mcpServers": {
      "hedgehog-library": {
        "command": "python",
        "args": ["/path/to/hedgehog-library/backend/mcp_server.py"],
        "env": {
          "HEDGEHOG_API_URL": "http://localhost:8000"
        }
      }
    }
  }
"""

import asyncio
import os
import sys
import json
from typing import Optional
from pathlib import Path
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

import httpx
from fastmcp import FastMCP

API_BASE = os.environ.get("HEDGEHOG_API_URL", "http://localhost:8000")
KANBAN_FILE = os.environ.get(
    "HEDGEHOG_KANBAN_FILE",
    str(Path(__file__).parent / "kanban.json")
)


# ── Kanban board helpers ──────────────────────────────────────────────────────
def _load_kanban() -> dict:
    """Load kanban board from JSON file, creating it if absent."""
    path = Path(KANBAN_FILE)
    if not path.exists():
        default = {"columns": ["todo", "reading", "done"], "cards": []}
        path.write_text(json.dumps(default, indent=2))
        return default
    return json.loads(path.read_text())


def _save_kanban(data: dict) -> None:
    """Save kanban board to JSON file."""
    Path(KANBAN_FILE).write_text(json.dumps(data, indent=2))

mcp = FastMCP("Hedgehog Library", instructions="""\
You have access to Sean's personal library catalog — 200+ books across 27 physical shelves.
The collection spans philosophy (continental & analytic), fiction, science, history, and more.
Books have rich metadata: shelf location, reading status, tags, time period, philosophical school,
related authors, and semantic embeddings for natural language search.

RECOMMENDATION WORKFLOW:
- When you find something interesting (book or journal article), use add_book_recommendation()
- Include notes on why it's relevant
- Mark it source_type='journal_article' if it's an article/paper, else 'book'
- These are saved with reading_status='to_read' for Sean to review later
- Call get_recommendations() to see all pending recommendations

GENERAL USAGE:
- Always include shelf numbers when referencing books so Sean can find them physically
- When recommending, prefer books he hasn't read yet (reading_status = 'unread')
- Use search_books for conceptual/thematic queries and find_books_by_author for author lookups
""")


# ── 1. Semantic search ─────────────────────────────────────────────────────────
@mcp.tool()
async def search_books(
    query: str,
    limit: int = 10,
    shelf: Optional[int] = None,
    status: Optional[str] = None,
) -> str:
    """
    Semantically search the library catalog using natural language.

    Args:
        query:  Natural language query (e.g. "phenomenology of time", "Buddhist ethics",
                "novels about memory", "ancient greek cosmology")
        limit:  Max results to return (default 10, max 30)
        shelf:  Optional — limit search to a specific shelf (1–27)
        status: Optional — filter by reading status: 'unread', 'reading', or 'read'

    Returns:
        Ranked list of matching books with shelf locations and similarity scores.
    """
    params: dict = {"q": query, "limit": min(limit, 30)}
    if shelf:
        params["shelf"] = shelf

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/search", params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()

    results = data.get("results", [])

    # Optional status post-filter (search API doesn't support it directly)
    if status:
        results = [r for r in results if r["book"].get("reading_status") == status]

    if not results:
        return f"No books found matching '{query}'" + (
            f" with status '{status}'" if status else ""
        )

    lines = [f"Search results for '{query}':\n"]
    for i, r in enumerate(results, 1):
        b = r["book"]
        shelf_str = f"Shelf {b['shelf']}" if b.get("shelf") else "Unassigned"
        tags_str  = f"\n   🏷  {b['tags']}" if b.get("tags") else ""
        status_emoji = {"read": "✓", "reading": "📖", "unread": "○"}.get(
            b.get("reading_status", ""), ""
        )
        stars = "★" * (b.get("rating") or 0)
        lines.append(
            f"{i}. **{b['title']}** {status_emoji}{(' ' + stars) if stars else ''}\n"
            f"   {b.get('creators', 'Unknown author')}\n"
            f"   📍 {shelf_str}  ·  {(r['score'] * 100):.0f}% match{tags_str}"
        )
        if b.get("description"):
            desc = b["description"][:180].rstrip()
            lines.append(f"   {desc}…")
        lines.append("")

    return "\n".join(lines)


# ── 2. Shelf contents ──────────────────────────────────────────────────────────
@mcp.tool()
async def get_shelf(shelf_number: int) -> str:
    """
    List all books on a specific physical shelf.

    Args:
        shelf_number: Shelf number from 1 to 27

    Returns:
        All books on that shelf, sorted by title, with their metadata.
    """
    if not 1 <= shelf_number <= 27:
        return "Shelf numbers must be between 1 and 27."

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/shelves/{shelf_number}", timeout=10)
        resp.raise_for_status()
        books = resp.json()

    if not books:
        return f"Shelf {shelf_number} is empty or has no assigned books."

    read    = sum(1 for b in books if b.get("reading_status") == "read")
    reading = sum(1 for b in books if b.get("reading_status") == "reading")

    lines = [f"📚 Shelf {shelf_number} — {len(books)} book(s)  [✓{read} read · 📖{reading} reading]\n"]
    for b in sorted(books, key=lambda x: x.get("title", "")):
        status_icon = {"read": "✓", "reading": "📖", "unread": "○"}.get(
            b.get("reading_status", ""), " "
        )
        period = f" ({b['time_period']})" if b.get("time_period") else ""
        tags   = f" [{b['tags']}]" if b.get("tags") else ""
        stars  = "★" * (b.get("rating") or 0)
        lines.append(
            f"  {status_icon} **{b['title']}**{period} — {b.get('creators', 'Unknown')}"
            f"{(' ' + stars) if stars else ''}{tags}"
        )

    return "\n".join(lines)


# ── 3. Shelves overview ────────────────────────────────────────────────────────
@mcp.tool()
async def list_shelves() -> str:
    """
    Overview of all 27 shelves showing how many books are on each.
    Useful for understanding the library layout before diving into specific shelves.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/shelves", timeout=10)
        resp.raise_for_status()
        data = resp.json()

    total = sum(s["count"] for s in data["shelves"])
    lines = [f"Library overview — {total} books across shelves:\n"]
    for s in data["shelves"]:
        if s["count"] > 0:
            bar = "█" * min(s["count"], 20) + ("+" if s["count"] > 20 else "")
            lines.append(f"  Shelf {s['shelf']:2d}: {s['count']:3d}  {bar}")
    if data.get("unassigned", 0):
        lines.append(f"\n  Unassigned: {data['unassigned']} books")

    return "\n".join(lines)


# ── 4. Find by author ──────────────────────────────────────────────────────────
@mcp.tool()
async def find_books_by_author(author_name: str) -> str:
    """
    Find all books by a specific author (supports partial name matching).

    Args:
        author_name: Full or partial author name (e.g. "Gadamer", "Hannah Arendt", "Merleau")
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/books",
            params={"search": author_name, "limit": 80},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    books = data["books"]
    if not books:
        return f"No books found for author '{author_name}'"

    lines = [f"Books matching author '{author_name}' ({len(books)} found):\n"]
    for b in sorted(books, key=lambda x: x.get("title", "")):
        shelf_str   = f"Shelf {b['shelf']}" if b.get("shelf") else "Unassigned"
        status_icon = {"read": "✓", "reading": "📖", "unread": "○"}.get(
            b.get("reading_status", ""), " "
        )
        stars = "★" * (b.get("rating") or 0)
        lines.append(
            f"  {status_icon} **{b['title']}** {stars}\n"
            f"     {b.get('creators', 'Unknown')} · 📍 {shelf_str}"
        )

    return "\n".join(lines)


# ── 5. Book details ────────────────────────────────────────────────────────────
@mcp.tool()
async def get_book_details(book_id: int) -> str:
    """
    Get full details for a specific book by its numeric ID.

    Args:
        book_id: The numeric ID of the book (from search results)
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/books/{book_id}", timeout=10)
        if resp.status_code == 404:
            return f"Book {book_id} not found"
        resp.raise_for_status()
        b = resp.json()

    shelf_str = f"Shelf {b['shelf']}" if b.get("shelf") else "Not assigned to a shelf"
    stars     = "★" * (b.get("rating") or 0) or "Unrated"

    lines = [
        f"**{b['title']}**",
        f"Author:    {b.get('creators', 'Unknown')}",
        f"Publisher: {b.get('publisher', 'N/A')} ({b.get('publish_date', 'N/A')})",
        f"Pages:     {b.get('pages', 'N/A')}",
        f"ISBN:      {b.get('isbn13', b.get('isbn10', 'N/A'))}",
        f"Location:  📍 {shelf_str}",
        f"Status:    {b.get('reading_status', 'unread')}",
        f"Rating:    {stars}",
    ]
    if b.get("time_period"):
        lines.append(f"Period:    {b['time_period']}")
    if b.get("philosophical_school"):
        lines.append(f"Genre:     {b['philosophical_school']}")
    if b.get("tags"):
        lines.append(f"Tags:      {b['tags']}")
    if b.get("related_authors"):
        lines.append(f"See also:  {b['related_authors']}")
    if b.get("notes"):
        lines.append(f"Notes:     {b['notes']}")
    if b.get("description"):
        lines.append(f"\n{b['description']}")

    return "\n".join(lines)


# ── 6. Reading stats ───────────────────────────────────────────────────────────
@mcp.tool()
async def get_reading_stats() -> str:
    """
    Get an overview of Sean's reading statistics across the whole library.
    Shows counts by status, top-rated books, shelves by density, and more.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/books", params={"limit": 1000}, timeout=15)
        resp.raise_for_status()
        data = resp.json()

    books = data["books"]
    total = data["total"]

    read    = [b for b in books if b.get("reading_status") == "read"]
    reading = [b for b in books if b.get("reading_status") == "reading"]
    unread  = [b for b in books if b.get("reading_status") == "unread"]
    rated   = [b for b in books if b.get("rating")]

    avg_rating = (
        sum(b["rating"] for b in rated) / len(rated)
        if rated else 0
    )
    top_rated = sorted(rated, key=lambda b: b["rating"], reverse=True)[:5]

    currently_reading = [
        f"  • {b['title']} (Shelf {b.get('shelf', '?')})"
        for b in reading[:5]
    ]

    lines = [
        f"📚 Library Statistics — {total} books\n",
        f"  ✓  Read:         {len(read):>4d} ({100 * len(read) // max(total, 1)}%)",
        f"  📖 Reading:      {len(reading):>4d}",
        f"  ○  Unread:       {len(unread):>4d}",
        f"  ★  Rated:        {len(rated):>4d}  (avg {avg_rating:.1f}/5)",
        f"  ✦  AI-enriched:  {sum(1 for b in books if b.get('enriched')):>4d}",
        "",
    ]

    if currently_reading:
        lines.append("Currently reading:")
        lines.extend(currently_reading)
        lines.append("")

    if top_rated:
        lines.append("Top-rated books:")
        for b in top_rated:
            stars = "★" * b["rating"]
            lines.append(f"  {stars}  {b['title']} — {b.get('creators', '?')}")
        lines.append("")

    return "\n".join(lines)


# ── 7. Rate a book ─────────────────────────────────────────────────────────────
@mcp.tool()
async def rate_book(book_id: int, rating: int, status: Optional[str] = None) -> str:
    """
    Set the rating (and optionally reading status) for a book.

    Args:
        book_id: The numeric ID of the book
        rating:  Star rating from 1–5 (0 to clear the rating)
        status:  Optional reading status: 'unread', 'reading', or 'read'

    Returns:
        Confirmation with the updated book details.
    """
    if not 0 <= rating <= 5:
        return "Rating must be between 0 (clear) and 5."
    if status and status not in ("unread", "reading", "read"):
        return "Status must be 'unread', 'reading', or 'read'."

    patch: dict = {"rating": rating or None}
    if status:
        patch["reading_status"] = status

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{API_BASE}/api/books/{book_id}",
            json=patch,
            timeout=10,
        )
        if resp.status_code == 404:
            return f"Book {book_id} not found."
        resp.raise_for_status()
        b = resp.json()

    stars = "★" * (b.get("rating") or 0) or "Unrated"
    return (
        f"Updated **{b['title']}**\n"
        f"Rating: {stars}\n"
        f"Status: {b.get('reading_status', 'unread')}"
    )


# ── 8. Add book recommendation ────────────────────────────────────────────────
@mcp.tool()
async def add_book_recommendation(
    title: str,
    creators: Optional[str] = None,
    description: Optional[str] = None,
    notes: Optional[str] = None,
    source_type: str = "book",
    recommended_by: str = "Claude",
) -> str:
    """
    Add a recommended book or journal article to the library.
    Creates it with reading_status='to_read' so it shows up in recommendations queue.

    Args:
        title: Title of the book or article
        creators: Author(s) name
        description: Brief description or abstract
        notes: Personal notes on why you're recommending it
        source_type: 'book' or 'journal_article' (default: 'book')
        recommended_by: Who recommended it - 'Claude' or 'Dawn' (default: 'Claude')

    Returns:
        Confirmation with the new book ID so you can reference it later.
    """
    if source_type not in ("book", "journal_article"):
        return "source_type must be 'book' or 'journal_article'"
    if recommended_by not in ("Claude", "Dawn"):
        return "recommended_by must be 'Claude' or 'Dawn'"

    payload = {
        "title": title,
        "creators": creators,
        "description": description,
        "notes": notes,
        "reading_status": "to_read",
        "source_type": source_type,
        "recommended_by": recommended_by,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/api/books",
            json=payload,
            timeout=10,
        )
        if resp.status_code != 201:
            return f"Failed to add recommendation: {resp.text}"
        book = resp.json()

        # Auto-enrich the recommendation for tags/categorization (async, don't wait)
        try:
            enrich_resp = await client.post(
                f"{API_BASE}/api/books/{book['id']}/enrich",
                timeout=20,
            )
            if enrich_resp.status_code == 200:
                book = enrich_resp.json()
        except Exception:
            pass  # Enrichment is optional; don't fail if it errors

    type_str = "article" if source_type == "journal_article" else "book"
    tags_str = f"\n🏷  {book.get('tags')}" if book.get("tags") else ""
    return (
        f"✓ Added {type_str} recommendation\n"
        f"**{book['title']}**\n"
        f"ID: {book['id']}{tags_str}\n"
        f"Recommended by: {recommended_by}\n"
        f"Status: to_read"
    )


# ── 9. Unread recommendations ──────────────────────────────────────────────────
@mcp.tool()
async def recommend_unread(
    topic: Optional[str] = None,
    shelf: Optional[int] = None,
    limit: int = 8,
) -> str:
    """
    Find unread books in the library, optionally matching a topic or from a specific shelf.
    Great for: "What should I read next?" questions.

    Args:
        topic: Optional topic/theme to match semantically (e.g. "ethics", "modernist fiction")
        shelf: Optional shelf number to limit to
        limit: Max books to return (default 8)
    """
    if topic:
        # Use semantic search filtered to unread
        params: dict = {"q": topic, "limit": 30}
        if shelf:
            params["shelf"] = shelf
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{API_BASE}/api/search", params=params, timeout=20)
            resp.raise_for_status()
            results = resp.json().get("results", [])

        unread = [
            r for r in results
            if r["book"].get("reading_status", "unread") == "unread"
        ][:limit]

        if not unread:
            return f"No unread books matched '{topic}'."

        lines = [f"Unread books matching '{topic}':\n"]
        for r in unread:
            b = r["book"]
            shelf_str = f"Shelf {b['shelf']}" if b.get("shelf") else "Unassigned"
            lines.append(
                f"• **{b['title']}** — {b.get('creators', '?')}\n"
                f"  📍 {shelf_str}"
            )
            if b.get("description"):
                lines.append(f"  {b['description'][:140]}…")
            lines.append("")
    else:
        # Just list unread books
        params = {"status": "unread", "limit": limit}
        if shelf:
            params["shelf"] = shelf
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{API_BASE}/api/books", params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

        books = data["books"]
        if not books:
            return "No unread books found" + (f" on shelf {shelf}" if shelf else "") + "."

        lines = [f"Unread books ({data['total']} total):\n"]
        for b in books:
            shelf_str = f"Shelf {b['shelf']}" if b.get("shelf") else "Unassigned"
            period    = f" [{b['time_period']}]" if b.get("time_period") else ""
            lines.append(f"• **{b['title']}** — {b.get('creators', '?')}  📍 {shelf_str}{period}")

    return "\n".join(lines)


# ── 10. View recommendations ────────────────────────────────────────────────
@mcp.tool()
async def get_recommendations() -> str:
    """
    View all items marked as 'to_read' (pending recommendations to add to library).
    Shows recently added recommendations with who suggested them.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/books",
            params={"status": "to_read", "limit": 100},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    books = data["books"]
    if not books:
        return "No pending recommendations. You're all caught up! 📚"

    lines = [f"📋 Recommendations to review ({len(books)} pending):\n"]

    # Group by recommended_by
    by_source = {}
    for b in books:
        source = b.get("recommended_by", "Unknown")
        if source not in by_source:
            by_source[source] = []
        by_source[source].append(b)

    for source in sorted(by_source.keys()):
        lines.append(f"\n**From {source}:**")
        for b in by_source[source]:
            type_emoji = "📄" if b.get("source_type") == "journal_article" else "📖"
            lines.append(f"  {type_emoji} **{b['title']}** (ID: {b['id']})")
            if b.get("creators"):
                lines.append(f"     {b['creators']}")
            if b.get("notes"):
                lines.append(f"     💭 {b['notes']}")

    return "\n".join(lines)


# ── 11. Kanban board: Get board ────────────────────────────────────────────────
@mcp.tool()
async def get_kanban() -> str:
    """
    Display the kanban board with all task cards grouped by column.
    Shows To Do, Reading, and Done columns for tracking book progress.

    Returns:
        Formatted kanban board with card titles and notes.
    """
    board = _load_kanban()
    lines = ["📋 Kanban Board\n"]

    for col in board.get("columns", ["todo", "reading", "done"]):
        label = {"todo": "To Do", "reading": "Reading", "done": "Done"}.get(col, col)
        cards = [c for c in board.get("cards", []) if c.get("column") == col]
        lines.append(f"**{label}** ({len(cards)})")

        if not cards:
            lines.append("  (empty)")
        else:
            for card in cards:
                lines.append(f"  [{card['id']}] {card['title']}")
                if card.get("author"):
                    lines.append(f"      by {card['author']}")
                if card.get("notes"):
                    lines.append(f"      {card['notes']}")

        lines.append("")

    return "\n".join(lines)


# ── 12. Kanban board: Add card ─────────────────────────────────────────────────
@mcp.tool()
async def add_kanban_card(
    title: str,
    column: str = "todo",
    author: Optional[str] = None,
    notes: Optional[str] = None,
    source_type: Optional[str] = None,
    book_id: Optional[int] = None,
) -> str:
    """
    Add a new card to the kanban board.

    Args:
        title:       Card title (book/article title)
        column:      Which column to add to: 'todo', 'reading', or 'done' (default: 'todo')
        author:      Optional author name
        notes:       Optional notes on why you're tracking this
        source_type: Optional 'book' or 'journal_article'
        book_id:     Optional ID linking back to library book

    Returns:
        Confirmation with the new card ID.
    """
    if column not in ("todo", "reading", "done"):
        return "column must be 'todo', 'reading', or 'done'"

    board = _load_kanban()
    card_id = int(datetime.now().timestamp() * 1000) % 1000000
    card = {
        "id": card_id,
        "title": title,
        "column": column,
        "author": author,
        "notes": notes,
        "source_type": source_type,
        "book_id": book_id,
        "created_at": datetime.now().isoformat(),
    }
    board["cards"].append(card)
    _save_kanban(board)

    return f"✓ Added card [{card_id}] **{title}** to {column}"


# ── 13. Kanban board: Move card ────────────────────────────────────────────────
@mcp.tool()
async def move_kanban_card(card_id: int, to_column: str) -> str:
    """
    Move a card to a different column on the kanban board.

    Args:
        card_id:    The card ID (from get_kanban or add_kanban_card)
        to_column:  Destination column: 'todo', 'reading', or 'done'

    Returns:
        Confirmation that the card was moved.
    """
    if to_column not in ("todo", "reading", "done"):
        return "to_column must be 'todo', 'reading', or 'done'"

    board = _load_kanban()
    card = next((c for c in board["cards"] if c["id"] == card_id), None)
    if not card:
        return f"Card {card_id} not found"

    old_col = card["column"]
    card["column"] = to_column
    _save_kanban(board)

    return f"✓ Moved **{card['title']}** from {old_col} → {to_column}"


if __name__ == "__main__":
    mcp.run()
