# 🦔 Hedgehog Library Manual

A personal library catalog with semantic search, Claude-powered enrichment, and MCP integration for Claude Desktop.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Using the Application](#using-the-application)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [MCP Integration](#mcp-integration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Hedgehog Library** is a full-stack application for managing your personal book collection with smart discovery features:

- **Semantic Search**: Find books by meaning, not just keywords (e.g., "philosophy of consciousness" finds related works)
- **Automatic Enrichment**: Claude AI fills in missing metadata—descriptions, tags, related authors, time periods
- **Shelf Organization**: Organize 206 books across 27 custom shelves
- **MCP Integration**: Query your library from Claude Desktop using natural language
- **Vector Embeddings**: Uses all-MiniLM-L6-v2 for local, private semantic search
- **PostgreSQL + pgvector**: Robust database with vector similarity operations

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | FastAPI (Python) |
| **Database** | PostgreSQL 15 + pgvector extension |
| **Frontend** | React + Vite + TypeScript + Tailwind CSS |
| **Embeddings** | all-MiniLM-L6-v2 (384-dimensional, local) |
| **Enrichment** | Claude Haiku API |
| **MCP Server** | FastMCP (Python) |

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Anthropic API key (for enrichment feature only)
- ~2GB disk space for embedding model

### Installation

#### Step 1: Clone & Setup Environment

```bash
cd hedgehog-library
cp .env.example .env
```

Edit `.env` and add your API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

#### Step 2: Start Backend & Database

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5435` with pgvector extension
- **FastAPI** on `localhost:8000`
- Embedding model (auto-downloaded, ~200MB)

Verify with:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok", "service": "hedgehog-library"}
```

#### Step 3: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

Access from other devices on your network:
```bash
http://<YOUR_LOCAL_IP>:5173
```

Find your IP with:
```bash
ifconfig | grep inet
```

#### Step 4: Import Books

Two options:

**Option A — UI Import:**
1. Click the ⚙️ (settings) button in the top right
2. Select "Import CSV"
3. Drag your `library.csv` file

**Option B — Command Line:**
```bash
curl -X POST http://localhost:8000/api/books/import/csv \
  -F "file=@library.csv"
```

**CSV Format** (required headers):
```csv
title,creators,isbn,published,shelf,reading_status
"Book Title","Author Name","1234567890","2020","Fiction","Read"
```

Optional columns:
- `description` — book summary
- `tags` — comma-separated subjects
- `time_period` — historical period covered
- `philosophical_school` — philosophical tradition
- `related_authors` — comma-separated related authors

#### Step 5: Enrich Metadata

Once books are imported:
1. Click ⚙️ → "Enrich X pending"
2. Watch the live progress bar
3. Claude Haiku adds:
   - **Descriptions** (2-3 sentences)
   - **Tags** (5-8 subject tags)
   - **Related Authors** (3-5 suggestions)
   - **Time Period** (historical context)
   - **Philosophical School** (genre classification)

Cost: ~$0.0001 per book (206 books = ~$0.02 total)

---

## Using the Application

### Main UI Components

#### Shelf View
The primary view shows books organized by shelf:
- **Left sidebar** — Click shelf number to filter
- **Book grid** — Displays book covers, titles, authors
- **Search bar** — Semantic search across entire library
- **Settings** (⚙️) — Import, enrich, database management

#### Book Card
Each book shows:
- Title
- Creator(s)
- Shelf number
- Reading status (Read/Currently Reading/Want to Read)
- Tags (after enrichment)

Click a book card to open the detail view.

#### Book Detail View
Shows all metadata:
- Title, creators, ISBN, publication date
- Description
- Tags
- Related authors
- Time period
- Philosophical school
- Reading status
- Shelf assignment

**Actions:**
- Edit any field
- Move to different shelf
- Change reading status
- Delete book

### Searching

#### Text Search
Search by title or author:
- Type in the search bar
- Results update as you type
- Case-insensitive, partial matches

#### Semantic Search
Find books by meaning (uses embeddings):
- "books about consciousness"
- "phenomenology of time"
- "narrative in postmodern literature"
- "Eastern philosophy and Buddhism"

Results ranked by relevance, not keywords.

**Tip:** Search quality improves after enrichment (richer metadata = better embeddings).

#### Shelf Filtering
Click shelf number in left sidebar to see only books on that shelf, then search within that shelf.

### Managing Books

#### Add a Single Book
1. Click **+ Add Book** button
2. Fill in title, creator(s), ISBN
3. Optionally add description, tags, time period
4. Select shelf (default: shelf 1)
5. Click **Save**

Book embedding generated automatically.

#### Edit a Book
1. Click book card
2. Click **Edit** button
3. Modify any field
4. Click **Save**

Embedding regenerated automatically.

#### Delete a Book
1. Click book card
2. Click **Delete** button
3. Confirm

#### Move Books Between Shelves
1. Click book card
2. Change **Shelf** dropdown
3. Click **Save**

Or use bulk edit (if available).

### Shelf Management

View shelf summary:
1. Click ⚙️ → "View Shelves"
2. See count of books per shelf
3. Click shelf to filter

Create custom shelf names (planned feature):
- Currently shelves are numbered 1-27
- Future: support custom names (e.g., "Philosophy", "Fiction")

---

## Features

### Semantic Search (Vector Embeddings)

**How it works:**
- All books indexed with all-MiniLM-L6-v2 embeddings (384 dimensions)
- Search query converted to embedding
- PostgreSQL pgvector calculates cosine similarity
- Returns top 10 most similar books

**Example queries:**
```
"existentialism"
"narrative theory and postmodernism"
"ethics of artificial intelligence"
"history of consciousness studies"
```

**Quality factors:**
- Better after enrichment (more text = better embedding)
- Case-insensitive
- Works across all book fields (title, description, tags, authors)

### Claude Haiku Enrichment

**What it does:**
1. Takes basic book metadata (title, author, ISBN if available)
2. Queries Open Library API for publication data
3. Uses Claude Haiku to generate:
   - 2-3 sentence description
   - 5-8 subject tags
   - 3-5 related author recommendations
   - Historical time period
   - Philosophical school/tradition
4. Updates database and regenerates embeddings

**Running enrichment:**
```bash
curl -X POST http://localhost:8000/api/enrichment/enrich
```

Or via UI: Click ⚙️ → "Enrich X pending"

**Cost:** ~$0.0001 per book using Claude Haiku

**Tip:** Enrichment is optional but improves search quality significantly.

### Reading Status Tracking

Track what you're reading:
- **Want to Read** — in wishlist
- **Currently Reading** — in progress
- **Read** — completed

Filter by status in book list view.

### CSV Import & Export

**Import:**
1. Prepare CSV with book data
2. Click ⚙️ → "Import CSV"
3. Select file
4. Books added to database

**Export (planned):**
Currently can dump database directly via PostgreSQL.

---

## API Reference

All endpoints return JSON. Base URL: `http://localhost:8000/api`

### Books

#### List Books
```
GET /books
```

Query parameters:
- `shelf` (int, optional) — filter by shelf number
- `status` (string, optional) — filter by reading_status
- `search` (string, optional) — text search in title/creators
- `skip` (int, default 0) — pagination
- `limit` (int, default 100) — results per page

Response:
```json
{
  "books": [
    {
      "id": 1,
      "title": "Being and Nothingness",
      "creators": "Jean-Paul Sartre",
      "isbn": "9780415275232",
      "published": "1943",
      "shelf": 5,
      "reading_status": "Read",
      "description": "...",
      "tags": ["existentialism", "phenomenology"],
      "time_period": "20th century",
      "philosophical_school": "Continental",
      "related_authors": ["Heidegger", "Gadamer"],
      "enriched": true
    }
  ],
  "total": 206
}
```

#### Get Single Book
```
GET /books/{book_id}
```

#### Create Book
```
POST /books
Content-Type: application/json
```

Request body:
```json
{
  "title": "The Phenomenology of Perception",
  "creators": "Maurice Merleau-Ponty",
  "isbn": "9780415277860",
  "published": "1945",
  "shelf": 3,
  "reading_status": "Currently Reading",
  "description": "...",
  "tags": ["phenomenology"],
  "time_period": "20th century",
  "philosophical_school": "Continental"
}
```

#### Update Book
```
PATCH /books/{book_id}
Content-Type: application/json
```

Provide only fields to update. Embedding regenerated automatically.

#### Delete Book
```
DELETE /books/{book_id}
```

#### Import CSV
```
POST /books/import/csv
Content-Type: multipart/form-data
```

Upload a CSV file with book data.

### Search

#### Semantic Search
```
GET /search?q=<query>&limit=10&shelf=<optional_shelf_id>
```

Query parameters:
- `q` (string, required) — natural language search query
- `limit` (int, default 10, max 50) — results per page
- `shelf` (int, optional) — filter to specific shelf

Response:
```json
{
  "results": [
    {
      "book": {...full book object...},
      "score": 0.87
    }
  ]
}
```

Score ranges 0-1 (1 = perfect match).

### Shelves

#### List All Shelves
```
GET /shelves
```

Response:
```json
[
  {
    "shelf_id": 1,
    "count": 12,
    "percentage": 5.8
  },
  ...
]
```

#### Get Books on Shelf
```
GET /shelves/{shelf_id}
```

### Enrichment

#### Get Enrichment Status
```
GET /enrichment/status
```

Response:
```json
{
  "pending": 5,
  "enriched": 201,
  "total": 206
}
```

#### Start Enrichment (Server-Sent Events)
```
POST /enrichment/enrich
```

Streams progress updates:
```
data: {"processed": 1, "total": 206, "current": "Being and Nothingness"}
data: {"processed": 2, "total": 206, "current": "The Phenomenology of..."}
...
```

### Health Check
```
GET /health
```

Response:
```json
{"status": "ok", "service": "hedgehog-library"}
```

---

## MCP Integration

### What is MCP?

**Model Context Protocol** — a standard for connecting Claude to tools and data sources. Use Hedgehog Library directly from Claude Desktop with natural language queries.

### Setup

1. Find your hedgehog-library path:
```bash
pwd
# /Users/yourname/projects/hedgehog-library
```

2. Edit Claude Desktop config:
   - **macOS/Linux**: `~/.config/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add server configuration:
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

4. Restart Claude Desktop

5. Check connection: Look for 🦔 icon in Claude's tools menu

### Available MCP Tools

#### `search_books`
Search library semantically.

Example:
```
"Find me something on phenomenology of time"
```

Returns matching books with descriptions.

#### `get_shelf`
View books on a specific shelf.

Example:
```
"What's on shelf 12?"
```

#### `list_shelves`
Overview of all shelves.

Example:
```
"Give me an overview of the library"
```

#### `find_books_by_author`
Search by author name.

Example:
```
"What do I have by Heidegger?"
```

#### `get_book_details`
Get full details for a specific book.

Example:
```
"Tell me more about book ID 42"
```

### Example Conversations

**Query 1: Adjacent reading**
> "I want to read something adjacent to Ricoeur's work on narrative — what do I have and where is it?"

Claude will:
1. Search for "Ricoeur narrative"
2. Find similar books using semantic search
3. Tell you titles and shelf locations

**Query 2: Browse by theme**
> "What philosophy books do I have on consciousness?"

Claude will:
1. Search for "consciousness philosophy"
2. Filter results by book metadata
3. Present organized results

**Query 3: Library overview**
> "Give me a breakdown of my library by shelf"

Claude will:
1. List all shelves with book counts
2. Summarize collection coverage
3. Suggest areas to explore

---

## Troubleshooting

### Database Issues

#### "relation does not exist"
The PostgreSQL tables haven't been initialized yet.

**Solution:**
```bash
docker compose logs -f db
# Wait 5-10 seconds for schema creation
curl http://localhost:8000/health
```

If still failing, reinitialize:
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Restart
```

#### Can't connect to database
Default connection string:
```
postgresql://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library
```

Check PostgreSQL is running:
```bash
docker ps | grep hedgehog-db
```

#### Embedding model slow on first request
The embedding model (all-MiniLM-L6-v2, ~200MB) is pre-downloaded in Docker. First request warms it in memory; subsequent requests are fast (< 50ms).

### Search Issues

#### Search returns poor results
**Cause:** Books haven't been enriched yet (minimal metadata for embeddings).

**Solution:** Run enrichment first
```bash
curl -X POST http://localhost:8000/api/enrichment/enrich
```

Richer metadata = better embeddings = better search quality.

#### Semantic search returns unrelated books
**Cause:** Query might be too vague or search scope too narrow.

**Solution:**
- Be more specific in query phrasing
- Remove shelf filter to search full library
- Ensure books are enriched (more text = better matching)

### Enrichment Issues

#### Enrichment fails with 401 error
**Cause:** Missing or invalid ANTHROPIC_API_KEY.

**Solution:**
```bash
# Check .env
cat .env | grep ANTHROPIC_API_KEY

# If missing or wrong, update it
export ANTHROPIC_API_KEY=sk-ant-...
docker compose restart backend
```

#### Enrichment is very slow
**Cause:** API rate limiting or slow network.

**Solution:**
- Check internet connection
- Wait a few minutes and retry
- Enrich smaller batches (currently enriches all pending)

#### Some books fail enrichment
**Cause:** ISBN lookup failed or unusual metadata format.

**Solution:**
- Enrich manually for those books
- Edit directly in UI with custom descriptions
- Check book data format in CSV

### Frontend Issues

#### Can't reach UI from phone
**Cause:** Using localhost instead of machine IP.

**Solution:**
```bash
# Find your machine IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Use it in phone browser
http://192.168.1.100:5173  # Example, use YOUR IP
```

Vite is already bound to `0.0.0.0` (all interfaces).

#### UI shows "Cannot reach backend"
**Cause:** FastAPI not running or CORS misconfigured.

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check logs
docker compose logs -f backend

# Restart if needed
docker compose restart backend
```

#### Styles/CSS not loading
**Cause:** Vite dev server cache issue.

**Solution:**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Import Issues

#### CSV import shows "No valid rows"
**Cause:** Missing required columns or incorrect format.

**Solution:**
Check your CSV has these columns:
```csv
title,creators,isbn,published,shelf,reading_status
```

Example:
```csv
"Being and Nothingness","Jean-Paul Sartre","9780415275232","1943","5","Read"
```

#### Some rows import but others fail
**Cause:** Malformed data in specific rows (missing required fields, invalid shelf number).

**Solution:**
- Check for empty cells in required columns
- Ensure shelf numbers are 1-27
- Verify date format (YYYY or YYYY-MM-DD)
- Fix problem rows and reimport

### MCP Issues

#### MCP tools not appearing in Claude
**Cause:** Config not reloaded or server not running.

**Solution:**
```bash
# Verify hedgehog-library backend is running
curl http://localhost:8000/health

# Restart Claude Desktop completely
# Check claude_desktop_config.json has correct path (absolute, not ~)

# Test MCP server manually
python backend/mcp_server.py
```

#### MCP queries return errors
**Cause:** Backend API not responding or database issue.

**Solution:**
```bash
# Check backend logs
docker compose logs -f backend

# Verify database connection
docker compose logs -f db

# Restart stack
docker compose restart
```

---

## Database Details

### Connection String

```bash
postgresql://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library
```

### Direct Access

```bash
psql postgresql://hedgehog:hedgehog_secret@localhost:5435/hedgehog_library
```

### Key Tables

#### `books`
Main book table with pgvector column.

Key columns:
- `id` (int) — primary key
- `title` (text) — book title
- `creators` (text) — author name(s)
- `isbn` (text) — ISBN identifier
- `published` (text) — publication year
- `shelf` (int) — shelf number (1-27)
- `reading_status` (text) — Read/Currently Reading/Want to Read
- `description` (text) — book summary
- `tags` (text) — comma-separated subject tags
- `time_period` (text) — historical period
- `philosophical_school` (text) — genre/tradition
- `related_authors` (text) — comma-separated related names
- `embedding` (vector) — 384-dim vector from all-MiniLM-L6-v2
- `enriched` (boolean) — whether Claude enriched this book
- `created_at` (timestamp) — when added to library
- `updated_at` (timestamp) — last modification

### Example Queries

**Search by similarity:**
```sql
SELECT title, creators, 1 - (embedding <=> '[0.1, -0.2, ...]'::vector) AS similarity
FROM books
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0.1, -0.2, ...]'::vector
LIMIT 10;
```

**Books by shelf:**
```sql
SELECT title, creators, shelf FROM books WHERE shelf = 5 ORDER BY title;
```

**Unenriched books:**
```sql
SELECT id, title, creators FROM books WHERE enriched = FALSE;
```

---

## Performance Tips

### Search Optimization
- Enrich books first (improves embedding quality)
- Use specific search terms (e.g., "existentialism" vs. "philosophy")
- Narrow shelf filter if searching within one shelf frequently

### Database
- Embeddings are indexed automatically for fast similarity search
- Searches typically return in < 100ms
- CSV import is batch-optimized; 200+ books import in seconds

### API
- Limit parameter capped at 50 to prevent slow queries
- Pagination with skip/limit for large result sets
- Use specific shelf filter to reduce full-library scans

---

## Development

### Backend Development

```bash
# View logs
docker compose logs -f backend

# Rebuild after requirements change
docker compose build backend
docker compose up -d

# Access database
docker compose exec db psql -U hedgehog hedgehog_library

# Run MCP server standalone (for testing)
cd backend
python mcp_server.py
```

### Frontend Development

```bash
cd frontend

# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Features

1. **Database schema**: Update `backend/models.py`
2. **API endpoints**: Add to `backend/routers/`
3. **Frontend UI**: Add components in `frontend/src/`
4. **Rebuild**: `docker compose build backend` then `docker compose up -d`

---

## License

[Check LICENSE file]

## Support

For issues, see [TROUBLESHOOTING](#troubleshooting) above.

For bugs or feature requests, open an issue on the repository.
