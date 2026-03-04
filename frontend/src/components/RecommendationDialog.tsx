import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import type { Book } from '../lib/types'
import { books as booksApi } from '../lib/api'
import { toastSuccess, toastError } from '../lib/toast'

interface Props {
  onClose: () => void
  onAdded: (book: Book) => void
}

export function RecommendationDialog({ onClose, onAdded }: Props) {
  const [title, setTitle] = useState('')
  const [creators, setCreators] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState<'book' | 'journal_article'>('book')
  const [recommendedBy, setRecommendedBy] = useState<'Claude' | 'Dawn'>('Claude')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const book = await booksApi.create({
        title: title.trim(),
        creators: creators.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        reading_status: 'to_read',
        source_type: sourceType,
        recommended_by: recommendedBy,
      })
      onAdded(book)
      onClose()
      const typeLabel = sourceType === 'journal_article' ? 'article' : 'book'
      toastSuccess(`"${title}" added as recommendation`)
    } catch {
      toastError('Failed to save recommendation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-bark-900/60 dialog-backdrop flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl animate-slide-up shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="font-serif font-bold text-bark-900 text-lg">Add Recommendation</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setError('') }}
            placeholder="Title *"
            className="input text-sm"
            autoFocus
          />

          {/* Author/Creator */}
          <input
            type="text"
            value={creators}
            onChange={e => setCreators(e.target.value)}
            placeholder="Author(s)"
            className="input text-sm"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Summary or abstract (optional)"
            rows={2}
            className="input text-sm resize-none"
          />

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why are you recommending this? (optional)"
            rows={2}
            className="input text-sm resize-none"
          />

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-bark-700">Type</label>
            <div className="flex gap-2">
              {(['book', 'journal_article'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSourceType(type)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    sourceType === type
                      ? 'shelf-chip-active text-cream-50 shadow-sm'
                      : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
                  }`}
                >
                  {type === 'book' ? '📖 Book' : '📄 Article'}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended by selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-bark-700">Source</label>
            <div className="flex gap-2">
              {(['Claude', 'Dawn'] as const).map(source => (
                <button
                  key={source}
                  onClick={() => setRecommendedBy(source)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    recommendedBy === source
                      ? 'shelf-chip-active text-cream-50 shadow-sm'
                      : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-rust-500 bg-rust-400/8 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="btn-primary w-full gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus size={14} />
                Add Recommendation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
