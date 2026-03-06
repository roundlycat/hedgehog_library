import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Plus, Settings, BookOpen, X, SlidersHorizontal,
  Library, BarChart2, ChevronDown, Check, ArrowUpDown
} from 'lucide-react'
import type { Book, ShelvesResponse, EnrichStatus, SearchResult } from './lib/types'
import { books as booksApi, search as searchApi, shelves as shelvesApi, enrichment as enrichApi } from './lib/api'
import { BookCard, BookCardSkeleton } from './components/BookCard'
import { BookDetailDialog } from './components/BookDetailDialog'
import { ShelfPanel } from './components/ShelfPanel'
import { EnrichmentPanel } from './components/EnrichmentPanel'
import { ImportPanel } from './components/ImportPanel'
import { AddBookDialog } from './components/AddBookDialog'
import { RecommendationDialog } from './components/RecommendationDialog'

// ── Sort & filter ─────────────────────────────────────────────────────────────
type SortKey = 'title' | 'creator' | 'added' | 'rating'
type StatusFilter = 'all' | 'unread' | 'reading' | 'read'

function sortBooks(books: Book[], key: SortKey): Book[] {
  return [...books].sort((a, b) => {
    if (key === 'title') return a.title.localeCompare(b.title)
    if (key === 'creator') return (a.creators ?? '').localeCompare(b.creators ?? '')
    if (key === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (key === 'added') return (b.added ?? '').localeCompare(a.added ?? '')
    return 0
  })
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function LibraryStats({ books, total }: { books: Book[]; total: number }) {
  const read = books.filter(b => b.reading_status === 'read').length
  const reading = books.filter(b => b.reading_status === 'reading').length
  const rated = books.filter(b => b.rating).length
  const avgRating = rated
    ? (books.reduce((s, b) => s + (b.rating ?? 0), 0) / rated).toFixed(1)
    : null

  const stats = [
    { label: 'Books', value: total, icon: '📚' },
    { label: 'Read', value: read, icon: '✓' },
    { label: 'Reading', value: reading, icon: '📖' },
    { label: 'Avg ★', value: avgRating ?? '—', icon: '⭐' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="bg-cream-50/10 rounded-xl px-3 py-2 text-center">
          <div className="text-cream-50 font-bold text-lg leading-none tabular-nums">
            {s.value}
          </div>
          <div className="text-cream-200/60 text-xs mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────
function SortDropdown({ sort, onSort }: { sort: SortKey; onSort: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const options: { key: SortKey; label: string }[] = [
    { key: 'title', label: 'Title A–Z' },
    { key: 'creator', label: 'Author A–Z' },
    { key: 'rating', label: 'Highest Rated' },
    { key: 'added', label: 'Recently Added' },
  ]
  const label = options.find(o => o.key === sort)?.label ?? 'Sort'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-ghost text-xs gap-1 py-1.5 px-3 h-auto min-h-0 border border-cream-200"
      >
        <ArrowUpDown size={11} />
        {label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 card shadow-modal z-20 min-w-[148px] py-1 animate-fade-in">
            {options.map(o => (
              <button
                key={o.key}
                onClick={() => { onSort(o.key); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                {sort === o.key && <Check size={12} className="text-moss-500" />}
                <span className={sort === o.key ? 'text-bark-900 font-medium' : 'text-bark-600'}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Status filter chip ────────────────────────────────────────────────────────
function StatusChips({ filter, onChange }: { filter: StatusFilter; onChange: (s: StatusFilter) => void }) {
  const chips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'reading', label: 'Reading' },
    { key: 'unread', label: 'To Read' },
    { key: 'read', label: 'Read' },
  ]
  return (
    <div className="flex gap-1.5">
      {chips.map(c => (
        <button
          key={c.key}
          onClick={() => onChange(c.key === filter ? 'all' : c.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${filter === c.key
            ? 'bg-bark-800 text-cream-50'
            : 'bg-cream-200 text-bark-600 hover:bg-cream-300'
            }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [total, setTotal] = useState(0)
  const [shelvesMeta, setShelvesMeta] = useState<ShelvesResponse | null>(null)
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus | null>(null)

  const [activeShelf, setActiveShelf] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [loading, setLoading] = useState(true)

  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadBooks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await booksApi.list({
        shelf: activeShelf ?? undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 500,
      })
      if (data && Array.isArray(data.books)) {
        setBooks(data.books)
        setTotal(data.total ?? 0)
      }
    } catch (err) {
      console.warn('Could not load books (backend may be offline):', err)
    } finally {
      setLoading(false)
    }
  }, [activeShelf, statusFilter])

  const loadShelves = async () => { try { const d = await shelvesApi.list(); if (d && Array.isArray(d.shelves)) setShelvesMeta(d) } catch (e) { console.warn('Shelves unavailable:', e) } }
  const loadEnrichStatus = async () => { try { const d = await enrichApi.status(); if (d && typeof d === 'object' && 'total' in d) setEnrichStatus(d) } catch (e) { console.warn('Enrich status unavailable:', e) } }

  useEffect(() => { loadBooks() }, [loadBooks])
  useEffect(() => { loadShelves(); loadEnrichStatus() }, [])

  // ── Semantic search (debounced) ─────────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const data = await searchApi.semantic(q, 30, activeShelf ?? undefined)
      if (data && Array.isArray(data.results)) {
        setSearchResults(data.results)
      }
    } catch (err) {
      console.warn('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }, [activeShelf])

  useEffect(() => {
    if (!searchQuery) { setSearchResults(null); return }
    const t = setTimeout(() => handleSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery, handleSearch])

  // ── Derived display list ────────────────────────────────────────────────────
  const displayBooks = useMemo((): Array<{ book: Book; score?: number }> => {
    if (searchResults) {
      return searchResults.map(r => ({ book: r.book, score: r.score }))
    }
    const filtered = statusFilter === 'all'
      ? books
      : books.filter(b => b.reading_status === statusFilter)
    return sortBooks(filtered, sortKey).map(b => ({ book: b }))
  }, [searchResults, books, sortKey, statusFilter])

  // ── Book CRUD callbacks ─────────────────────────────────────────────────────
  const handleBookUpdate = (updated: Book) => {
    setBooks(prev => prev.map(b => b.id === updated.id ? updated : b))
    if (selectedBook?.id === updated.id) setSelectedBook(updated)
    loadShelves()
  }

  const handleBookDelete = (id: number) => {
    setBooks(prev => prev.filter(b => b.id !== id))
    setTotal(t => t - 1)
    loadShelves()
  }

  const handleBookAdded = (book: Book) => {
    setBooks(prev => [...prev, book])
    setTotal(t => t + 1)
    loadShelves()
    loadEnrichStatus()
  }

  // ── Select shelf ────────────────────────────────────────────────────────────
  const selectShelf = (shelf: number | null) => {
    setActiveShelf(shelf)
    setSearchResults(null)
    setSearchQuery('')
  }

  const shelfLabel = activeShelf ? `Shelf ${activeShelf}` : 'All Books'
  const displayCount = searchResults ? searchResults.length : displayBooks.length

  return (
    <div className="min-h-screen bg-cream-100">

      {/* ── HEADER ── */}
      <header className="header-gradient text-cream-50 sticky top-0 z-30 shadow-header">
        {/* Top bar */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl leading-none select-none">🦔</span>
            <div className="hidden sm:block">
              <div className="font-serif font-bold text-lg leading-tight">Hedgehog Library</div>
              <div className="text-cream-200/50 text-[10px] leading-tight tracking-widest uppercase">
                Personal Collection
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-lg mx-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-200/50 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                if (!e.target.value) setSearchResults(null)
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Semantic search across your collection…"
              className="input-search text-cream-50 bg-cream-50/10 border-cream-50/15 placeholder:text-cream-200/40 focus:bg-cream-50/15 focus:ring-cream-50/20 focus:border-cream-50/25"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-cream-200/40 border-t-cream-50/80 animate-spin" />
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-200/50 hover:text-cream-50 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowStats(v => !v)}
              className={`btn-icon hover:bg-cream-50/10 ${showStats ? 'text-cream-50' : 'text-cream-200/70'}`}
              title="Stats"
            >
              <BarChart2 size={17} />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-rust-400 hover:bg-rust-300 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 shadow-sm hover:shadow-md"
                title="Add book"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add</span>
              </button>
              <button
                onClick={() => setShowRecommend(true)}
                className="flex items-center gap-1.5 bg-moss-400 hover:bg-moss-300 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 shadow-sm hover:shadow-md"
                title="Add recommendation"
              >
                <BookOpen size={15} />
                <span className="hidden sm:inline">Recommend</span>
              </button>
            </div>
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`btn-icon hover:bg-cream-50/10 ${showSettings ? 'text-cream-50 bg-cream-50/15' : 'text-cream-200/70'}`}
              title="Import & Enrichment"
            >
              <SlidersHorizontal size={17} />
            </button>
          </div>
        </div>

        {/* Stats panel (collapsible) */}
        {showStats && (
          <div className="px-4 pb-3 animate-fade-in">
            <LibraryStats books={books} total={total} />
          </div>
        )}
      </header>

      {/* ── BODY ── */}
      <div className="flex max-w-7xl mx-auto">

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-3 w-64 flex-shrink-0 p-4 sticky top-[57px] h-[calc(100dvh-57px)] overflow-y-auto">
          {shelvesMeta && (
            <ShelfPanel
              shelves={shelvesMeta.shelves}
              unassigned={shelvesMeta.unassigned}
              activeShelf={activeShelf}
              onSelectShelf={selectShelf}
              totalBooks={total}
            />
          )}

          {showSettings && (
            <>
              <ImportPanel onImported={() => { loadBooks(); loadShelves(); loadEnrichStatus() }} />
              <EnrichmentPanel
                status={enrichStatus}
                onComplete={() => { loadBooks(); loadEnrichStatus() }}
              />
            </>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 min-w-0">
          {/* Mobile horizontal shelf scroller */}
          <div className="md:hidden mb-3 overflow-x-auto">
            <div className="flex gap-1.5 pb-1 min-w-max">
              <button
                onClick={() => selectShelf(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${activeShelf === null ? 'bg-bark-800 text-cream-50' : 'bg-cream-200 text-bark-600'
                  }`}
              >
                All
              </button>
              {shelvesMeta?.shelves.filter(s => s.count > 0).map(s => (
                <button
                  key={s.shelf}
                  onClick={() => selectShelf(s.shelf)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${activeShelf === s.shelf ? 'bg-bark-800 text-cream-50' : 'bg-cream-200 text-bark-600'
                    }`}
                >
                  {s.shelf} <span className="opacity-50">({s.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Library size={15} className="text-bark-400 flex-shrink-0" />
              <h1 className="font-serif font-bold text-bark-900 text-lg leading-tight truncate">
                {searchResults ? `"${searchQuery}"` : shelfLabel}
              </h1>
              <span className="text-sm text-bark-400 tabular-nums flex-shrink-0">
                ({displayCount})
              </span>
            </div>

            {!searchResults && (
              <div className="flex items-center gap-2 flex-wrap">
                <StatusChips filter={statusFilter} onChange={f => { setStatusFilter(f) }} />
                <SortDropdown sort={sortKey} onSort={setSortKey} />
              </div>
            )}
          </div>

          {/* Mobile settings */}
          {showSettings && (
            <div className="md:hidden space-y-3 mb-4">
              <ImportPanel onImported={() => { loadBooks(); loadShelves(); loadEnrichStatus() }} />
              <EnrichmentPanel
                status={enrichStatus}
                onComplete={() => { loadBooks(); loadEnrichStatus() }}
              />
            </div>
          )}

          {/* Book grid */}
          {loading && !searchResults ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <BookCardSkeleton key={i} />)}
            </div>
          ) : displayBooks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">
                {searchQuery ? '🔍' : activeShelf ? '📦' : '📚'}
              </div>
              <p className="text-bark-400 text-sm">
                {searchQuery
                  ? 'No books matched — try broader terms'
                  : activeShelf
                    ? `Shelf ${activeShelf} is empty`
                    : 'No books here yet — import a CSV or add manually!'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayBooks.map(({ book, score }) => (
                <BookCard
                  key={book.id}
                  book={book}
                  score={score}
                  onClick={() => setSelectedBook(book)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── DIALOGS ── */}
      {selectedBook && (
        <BookDetailDialog
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={handleBookUpdate}
          onDelete={handleBookDelete}
        />
      )}
      {showAdd && (
        <AddBookDialog
          onClose={() => setShowAdd(false)}
          onAdded={handleBookAdded}
        />
      )}
      {showRecommend && (
        <RecommendationDialog
          onClose={() => setShowRecommend(false)}
          onAdded={handleBookAdded}
        />
      )}
    </div>
  )
}
