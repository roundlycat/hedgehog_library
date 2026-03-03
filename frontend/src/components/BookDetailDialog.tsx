import { useState } from 'react'
import {
  X, BookOpen, Tag, Users, Clock, MapPin, Trash2,
  ExternalLink, ChevronDown, ChevronUp, Pencil, Save
} from 'lucide-react'
import type { Book } from '../lib/types'
import { books as booksApi } from '../lib/api'
import { BookCover } from './BookCover'
import { StarRating } from './StarRating'
import { toastSuccess, toastError } from '../lib/toast'

interface Props {
  book: Book
  onClose: () => void
  onUpdate: (book: Book) => void
  onDelete: (id: number) => void
}

const READING_STATUSES = ['', 'unread', 'reading', 'read'] as const
const STATUS_LABELS: Record<string, string> = {
  '': 'No status',
  unread: 'To Read',
  reading: 'Currently Reading',
  read: 'Read ✓',
}

const STATUS_COLORS: Record<string, string> = {
  read: 'bg-moss-500/10 text-moss-600 border-moss-500/20',
  reading: 'bg-amber-400/10 text-amber-500 border-amber-400/20',
  unread: 'bg-bark-400/10 text-bark-500 border-bark-400/20',
}

export function BookDetailDialog({ book, onClose, onUpdate, onDelete }: Props) {
  const [shelf, setShelf] = useState<string>(book.shelf?.toString() ?? '')
  const [status, setStatus] = useState(book.reading_status ?? '')
  const [rating, setRating] = useState<number | null>(book.rating ?? null)
  const [notes, setNotes] = useState(book.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDesc, setShowDesc] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const isDirty =
    shelf !== (book.shelf?.toString() ?? '') ||
    status !== (book.reading_status ?? '') ||
    rating !== (book.rating ?? null) ||
    notes !== (book.notes ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      let updated = await booksApi.update(book.id, {
        reading_status: status || null,
        notes: notes || null,
        rating: rating,
      })
      if (shelf !== (book.shelf?.toString() ?? '')) {
        updated = shelf
          ? await booksApi.assignShelf(book.id, parseInt(shelf))
          : await booksApi.update(book.id, { shelf: null })
      }
      onUpdate(updated)
      onClose()
      toastSuccess('Book updated')
    } catch {
      toastError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${book.title}" from your library?`)) return
    setDeleting(true)
    try {
      await booksApi.delete(book.id)
      onDelete(book.id)
      onClose()
      toastSuccess('Book removed')
    } catch {
      toastError('Failed to delete book')
    } finally {
      setDeleting(false)
    }
  }

  const isbnSearch = book.isbn13 || book.isbn10
  const openLibraryUrl = isbnSearch
    ? `https://openlibrary.org/isbn/${isbnSearch}`
    : `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`

  return (
    <div
      className="fixed inset-0 bg-bark-900/60 dialog-backdrop flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto animate-slide-up shadow-modal">

        {/* ── Header ── */}
        <div className="flex gap-4 p-5 pb-4">
          <BookCover book={book} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h2 className="font-serif text-xl font-bold text-bark-900 leading-tight">{book.title}</h2>
                {book.creators && (
                  <p className="text-bark-500 text-sm mt-0.5">{book.creators}</p>
                )}
              </div>
              <button onClick={onClose} className="btn-icon flex-shrink-0 -mt-1 -mr-1">
                <X size={18} />
              </button>
            </div>

            {/* Reading status badge */}
            {book.reading_status && (
              <span className={`badge mt-2 border ${STATUS_COLORS[book.reading_status] ?? ''}`}>
                {STATUS_LABELS[book.reading_status]}
              </span>
            )}

            {/* Star rating display */}
            <div className="mt-2">
              <StarRating rating={rating} onChange={setRating} size={16} />
            </div>
          </div>
        </div>

        {/* ── Meta pills ── */}
        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
          {book.time_period && (
            <span className="tag-pill">
              <Clock size={10} />{book.time_period}
            </span>
          )}
          {book.philosophical_school && (
            <span className="tag-pill">
              <BookOpen size={10} />{book.philosophical_school}
            </span>
          )}
          {book.pages && (
            <span className="tag-pill">{book.pages.toLocaleString()} pages</span>
          )}
          {book.publisher && (
            <span className="tag-pill">{book.publisher}</span>
          )}
          {book.publish_date && (
            <span className="tag-pill">{book.publish_date}</span>
          )}
          {book.enriched && (
            <span className="badge bg-moss-500/10 text-moss-600 border border-moss-500/20">
              ✦ AI enriched
            </span>
          )}
        </div>

        {/* ── Description ── */}
        {book.description && (
          <div className="px-5 pb-4">
            <p className={`text-sm text-bark-700 leading-relaxed ${showDesc ? '' : 'line-clamp-3'}`}>
              {book.description}
            </p>
            {book.description.length > 200 && (
              <button
                onClick={() => setShowDesc(v => !v)}
                className="text-xs text-bark-400 hover:text-bark-700 mt-1 flex items-center gap-0.5 transition-colors"
              >
                {showDesc ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />Read more</>}
              </button>
            )}
          </div>
        )}

        {/* ── Tags + Related ── */}
        {book.tags && (
          <div className="px-5 pb-3 flex items-start gap-2">
            <Tag size={13} className="text-bark-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-bark-600 leading-relaxed">{book.tags}</p>
          </div>
        )}
        {book.related_authors && (
          <div className="px-5 pb-4 flex items-start gap-2">
            <Users size={13} className="text-bark-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-bark-600">Related: {book.related_authors}</p>
          </div>
        )}

        {/* ── Open Library link ── */}
        <div className="px-5 pb-3">
          <a
            href={openLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-bark-400 hover:text-bark-700 transition-colors"
          >
            <ExternalLink size={11} />
            View on Open Library
          </a>
        </div>

        <div className="divider mx-5" />

        {/* ── Editable fields ── */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-bark-400">
              My Library Details
            </h3>
            <button
              onClick={() => setEditMode(v => !v)}
              className="btn-ghost text-xs gap-1 py-1 px-2 h-auto min-h-0"
            >
              <Pencil size={11} />
              {editMode ? 'Done editing' : 'Edit'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-bark-500 mb-1.5 flex items-center gap-1">
                <MapPin size={10} /> Shelf Location
              </label>
              <select
                value={shelf}
                onChange={e => setShelf(e.target.value)}
                disabled={!editMode}
                className="input text-sm disabled:opacity-70 disabled:cursor-default"
              >
                <option value="">Unassigned</option>
                {Array.from({ length: 27 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>Shelf {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-bark-500 mb-1.5">Reading Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={!editMode}
                className="input text-sm disabled:opacity-70 disabled:cursor-default"
              >
                {READING_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-bark-500 mb-1.5">Notes & Highlights</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={!editMode}
              rows={3}
              placeholder="Your thoughts, highlights, marginalia..."
              className="input text-sm resize-none disabled:opacity-70 disabled:cursor-default"
            />
          </div>

          {/* ISBN */}
          {book.isbn13 && (
            <p className="text-xs text-bark-400 font-mono">ISBN-13: {book.isbn13}</p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="btn-primary flex-1 gap-2"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger px-3.5"
            title="Remove from library"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
