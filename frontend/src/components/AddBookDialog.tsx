import { useState } from 'react'
import { X, Search, Plus, Loader2, CheckCircle } from 'lucide-react'
import type { Book } from '../lib/types'
import { books as booksApi } from '../lib/api'
import { BookCover } from './BookCover'
import { toastSuccess, toastError } from '../lib/toast'
import { BarcodeScanner as ScannerDialog } from './ScannerDialog'
import { Scan } from 'lucide-react'

interface Props {
  onClose: () => void
  onAdded: (book: Book) => void
}

export function AddBookDialog({ onClose, onAdded }: Props) {
  const [tab, setTab] = useState<'isbn' | 'manual'>('isbn')
  const [isbn, setIsbn] = useState('')
  const [looking, setLooking] = useState(false)
  const [found, setFound] = useState<Partial<Book> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Manual form
  const [title, setTitle] = useState('')
  const [creators, setCreators] = useState('')
  const [description, setDescription] = useState('')

  const performLookup = async (q: string) => {
    if (!q) return
    setLooking(true)
    setError('')
    setFound(null)
    try {
      const data = await booksApi.isbnLookup(q)
      setFound(data)
    } catch {
      setError('Book not found via Open Library. Try manual entry.')
    } finally {
      setLooking(false)
    }
  }

  const handleISBNLookup = async () => {
    performLookup(isbn.replace(/[-\s]/g, '').trim())
  }

  const handleScan = (scannedIsbn: string) => {
    setScanning(false)
    setIsbn(scannedIsbn)
    performLookup(scannedIsbn.replace(/[-\s]/g, '').trim())
  }

  const handleAddFound = async () => {
    if (!found) return
    setSaving(true)
    try {
      const book = await booksApi.create({ ...found, isbn13: isbn.replace(/[-\s]/g, '') })
      onAdded(book)
      onClose()
      toastSuccess(`"${found.title}" added to library`)
    } catch {
      toastError('Failed to save book')
    } finally {
      setSaving(false)
    }
  }

  const handleManualAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const book = await booksApi.create({
        title: title.trim(),
        creators: creators.trim() || null,
        description: description.trim() || null,
      })
      onAdded(book)
      onClose()
      toastSuccess(`"${title}" added to library`)
    } catch {
      toastError('Failed to save book')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-bark-900/60 dialog-backdrop flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl animate-slide-up shadow-modal">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4">
            <h2 className="font-serif font-bold text-bark-900 text-lg">Add Book</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 px-5 pb-4">
            {(['isbn', 'manual'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setFound(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${tab === t
                  ? 'shelf-chip-active text-cream-50 shadow-sm'
                  : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
                  }`}
              >
                {t === 'isbn' ? '📖 ISBN Lookup' : '✏️ Manual Entry'}
              </button>
            ))}
          </div>

          <div className="px-5 pb-6 space-y-3">
            {/* ── ISBN tab ── */}
            {tab === 'isbn' && (
              <>
                <div className="flex gap-2 relative">
                  <input
                    type="text"
                    value={isbn}
                    onChange={e => { setIsbn(e.target.value); setError(''); setFound(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleISBNLookup()}
                    placeholder="978-0-385-46843-5"
                    className="input text-sm flex-1 font-mono pr-10"
                    autoFocus
                  />
                  <button
                    onClick={() => setScanning(true)}
                    type="button"
                    className="absolute right-[54px] top-1/2 -translate-y-1/2 text-bark-500 hover:text-moss-600 transition-colors p-1"
                    title="Scan Barcode"
                  >
                    <Scan size={18} />
                  </button>
                  <button
                    onClick={handleISBNLookup}
                    disabled={looking || !isbn.trim()}
                    className="btn-primary px-4"
                  >
                    {looking ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  </button>
                </div>

                <p className="text-xs text-bark-400">
                  Enter any ISBN-10 or ISBN-13 or scan the barcode.
                </p>

                {error && (
                  <p className="text-sm text-rust-500 bg-rust-400/8 rounded-xl px-3 py-2">{error}</p>
                )}

                {found && (
                  <div className="card p-4 space-y-2 border-moss-500/20 bg-moss-500/5">
                    <div className="flex gap-3">
                      {found.isbn13 && (
                        <BookCover
                          book={{ ...found, id: 0, enriched: false } as Book}
                          size="md"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-bark-900 text-sm leading-tight">
                          {found.title}
                        </p>
                        {found.creators && (
                          <p className="text-xs text-bark-500 mt-0.5">{found.creators}</p>
                        )}
                        {found.publisher && (
                          <p className="text-xs text-bark-400 mt-1">
                            {found.publisher}
                            {found.publish_date && ` · ${found.publish_date}`}
                          </p>
                        )}
                      </div>
                      <CheckCircle size={18} className="text-moss-500 flex-shrink-0 mt-0.5" />
                    </div>
                    <button
                      onClick={handleAddFound}
                      disabled={saving}
                      className="btn-primary text-sm w-full gap-2"
                    >
                      <Plus size={14} />
                      {saving ? 'Adding…' : 'Add to Library'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Manual tab ── */}
            {tab === 'manual' && (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title *"
                  className="input text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={creators}
                  onChange={e => setCreators(e.target.value)}
                  placeholder="Author(s)"
                  className="input text-sm"
                />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="input text-sm resize-none"
                />
                {error && (
                  <p className="text-sm text-rust-500">{error}</p>
                )}
                <button
                  onClick={handleManualAdd}
                  disabled={saving || !title.trim()}
                  className="btn-primary w-full gap-2"
                >
                  <Plus size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {scanning && (
        <ScannerDialog
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  )
}
