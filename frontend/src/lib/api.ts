import axios from 'axios'
import type { Book, BookListResponse, SearchResponse, ShelvesResponse, EnrichStatus } from './types'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

export const books = {
  list: (params?: { shelf?: number; status?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<BookListResponse>('/books', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Book>(`/books/${id}`).then(r => r.data),

  create: (data: Partial<Book>) =>
    api.post<Book>('/books', data).then(r => r.data),

  update: (id: number, data: Partial<Book>) =>
    api.patch<Book>(`/books/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/books/${id}`),

  assignShelf: (id: number, shelf: number) =>
    api.post<Book>(`/books/${id}/shelf`, { shelf }).then(r => r.data),

  importCSV: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/books/import/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },

  isbnLookup: (isbn: string) =>
    api.post('/books/isbn-lookup', { isbn }).then(r => r.data),

  enrich: (id: number) =>
    api.post<Book>(`/books/${id}/enrich`).then(r => r.data),
}

export const search = {
  semantic: (q: string, limit = 10, shelf?: number) =>
    api.get<SearchResponse>('/search', { params: { q, limit, shelf } }).then(r => r.data),
}

export const shelves = {
  list: () =>
    api.get<ShelvesResponse>('/shelves').then(r => r.data),

  getShelf: (shelf: number) =>
    api.get<Book[]>(`/shelves/${shelf}`).then(r => r.data),

  unassigned: () =>
    api.get<Book[]>('/shelves/unassigned/list').then(r => r.data),
}

export const enrichment = {
  status: () =>
    api.get<EnrichStatus>('/enrich/status').then(r => r.data),

  // Returns an EventSource for streaming progress
  streamEnrich: (bookIds?: number[], force = false): EventSource => {
    // POST to get an SSE stream - we use fetch + ReadableStream
    const basePath = import.meta.env.VITE_API_URL || '/api'
    return new EventSource(`${basePath}/enrich/stream`)
  },

  startEnrich: async (
    onProgress: (event: EnrichProgressEvent) => void,
    bookIds?: number[],
    force = false
  ) => {
    const basePath = import.meta.env.VITE_API_URL || '/api'
    const response = await fetch(`${basePath}/enrich/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_ids: bookIds ?? null, force })
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            onProgress(event)
          } catch { /* partial chunk */ }
        }
      }
    }
  }
}

export interface EnrichProgressEvent {
  type: 'start' | 'progress' | 'done'
  total?: number
  index?: number
  book_id?: number
  title?: string
  status?: 'ok' | 'error'
  message?: string
}
