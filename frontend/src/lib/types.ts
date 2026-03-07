export interface Book {
  id: number
  title: string
  creators: string | null
  first_name: string | null
  last_name: string | null
  isbn13: string | null
  isbn10: string | null
  description: string | null
  publisher: string | null
  publish_date: string | null
  pages: number | null
  tags: string | null
  related_authors: string | null
  time_period: string | null
  philosophical_school: string | null
  notes: string | null
  shelf: number | null
  reading_status: string | null
  rating: number | null
  enriched: boolean
  added: string | null
  source_type: string | null
  recommended_by: string | null
}

export interface SearchResult {
  book: Book
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
}

export interface BookListResponse {
  books: Book[]
  total: number
}

export interface ShelfInfo {
  shelf: number
  count: number
}

export interface ShelvesResponse {
  shelves: ShelfInfo[]
  unassigned: number
}

export interface EnrichStatus {
  total: number
  enriched: number
  pending: number
}

export type ReadingStatus = 'unread' | 'reading' | 'read'

export type ViewMode = 'library' | 'shelves' | 'search'

export interface WhisperResponse {
  id: number
  agent: string
  text: string
  triggered_by: string | null
  created_at: string
}
