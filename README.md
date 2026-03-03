# 🦔 Hedgehog Library

Personal library catalog with semantic search and Claude MCP integration.
206 books · 27 shelves · pgvector embeddings · local LLM enrichment

---

## Architecture

```
hedgehog-library/
├── docker-compose.yml          PostgreSQL 5434 + FastAPI 8000
├── backend/
│   ├── main.py                 FastAPI app
│   ├── models.py               SQLAlchemy + pgvector Book model
│   ├── routers/
│   │   ├── books.py            CRUD + CSV import + ISBN lookup
│   │   ├── search.py           Semantic cosine search
│   │   ├── shelves.py          27-shelf navigation
│   │   └── enrichment.py       SSE streaming enrichment
│   ├── services/
│   │   ├── embeddings.py       all-MiniLM-L6-v2 (384-dim, local)
│   │   └── enrichment.py       Claude Haiku enrichment + Open Library
│   └── mcp_server.py           FastMCP server for Claude Desktop
└── frontend/
    └── src/                    React + Vite + TypeScript + Tailwind
```

---

## Quick Start

### 1. Environment

```bash
cd hedgehog-library
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

Create `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start backend + database

```bash
docker compose up -d
```

This starts:
- PostgreSQL with pgvector on **localhost:5435** (isolated from your other containers)
- FastAPI on **localhost:8000**
- Embedding model (all-MiniLM-L6-v2) pre-downloaded during Docker build

Check it's running:
```bash
curl http://localhost:8000/health
```

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on **http://localhost:5173** — accessible from phone/tablet on your local network
at **http://YOUR_IP:5173**

### 4. Import your books

Option A — UI: Click the ⚙️ button → Import CSV → drag your `library.csv`

Option B — curl:
```bash
curl -X POST http://localhost:8000/api/books/import/csv \
  -F "file=@library.csv"
```

### 5. Enrich metadata

Click ⚙️ → "Enrich 39 pending" to fill missing descriptions, add tags,
related authors, and time periods using Claude Haiku. ~$0.02 for all 206 books.

Watch the live progress bar as it runs.

---

## MCP Integration (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hedgehog-library": {
      "command": "python",
      "args": ["/absolute/path/to/hedgehog-library/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "postgresql+asyncpg://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library",
        "HEDGEHOG_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Example usage |
|------|---------------|
| `search_books` | "Find me something on phenomenology of time" |
| `get_shelf` | "What's on shelf 12?" |
| `list_shelves` | "Give me an overview of the library" |
| `find_books_by_author` | "What do I have by Gadamer?" |
| `get_book_details` | Details for a specific book ID |

Example Claude conversation:
> "I want to read something adjacent to Ricoeur's work on narrative — what do I have and where is it?"

---

## Database

Runs on port **5434** to avoid conflicts with your constellation (5432) and atelier (5433) containers.

Connect directly:
```bash
psql postgresql://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library
```

### Key schema fields

```sql
SELECT title, creators, shelf, tags, time_period, philosophical_school,
       enriched, 1 - (embedding <=> '[...]'::vector) AS similarity
FROM books
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

---

## Enrichment

Each book gets enriched with:
- **Description** — 2-3 sentence summary (fills missing ones)
- **Tags** — 5-8 subject tags (e.g. `phenomenology, consciousness, 20th century`)
- **Related authors** — 3-5 authors the reader might also enjoy
- **Time period** — historical period covered
- **Philosophical school** — school/genre (Continental, Analytic, etc.)

After enrichment, embeddings are regenerated with the richer text for better search quality.

Uses **Claude Haiku** (fast, cheap) — ~$0.02 for the full 206-book collection.

---

## Development

```bash
# Backend logs
docker compose logs -f backend

# Rebuild after requirements change
docker compose build backend

# Database shell
docker compose exec db psql -U hedgehog hedgehog_library

# Run MCP server standalone (for testing)
cd backend
python mcp_server.py
```

---

## Troubleshooting

**"relation does not exist"** — wait a few seconds for the DB init, then retry.

**Embedding model slow first load** — it's pre-downloaded in Docker build; first
request warms the model in memory, subsequent requests are fast.

**Search returns poor results** — run enrichment first; richer text = better embeddings.

**Can't reach from phone** — confirm your machine's IP with `ifconfig | grep inet`,
use that IP instead of localhost. Vite is already bound to `0.0.0.0`.
