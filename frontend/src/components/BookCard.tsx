import { MapPin } from 'lucide-react'
import type { Book } from '../lib/types'
import { BookCover } from './BookCover'
import { StarRating } from './StarRating'

interface Props {
  book: Book
  onClick: () => void
  score?: number
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  read: { label: 'Read', className: 'badge-read' },
  reading: { label: 'Reading', className: 'badge-reading' },
  unread: { label: 'To Read', className: 'badge-unread' },
}

export function BookCard({ book, onClick, score }: Props) {
  const statusCfg = book.reading_status ? STATUS_CONFIG[book.reading_status] : null

  return (
    <button
      onClick={onClick}
      className="card-book w-full text-left p-3.5 flex gap-3 animate-fade-in"
    >
      {/* Cover */}
      <BookCover book={book} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title + status badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif font-semibold text-bark-900 leading-snug line-clamp-2 text-sm flex-1">
            {book.title}
          </h3>
          {statusCfg && (
            <span className={`${statusCfg.className} flex-shrink-0 mt-0.5`}>
              {statusCfg.label}
            </span>
          )}
        </div>

        {/* Author */}
        {book.creators && (
          <p className="text-xs text-bark-500 truncate">{book.creators}</p>
        )}

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
          {book.shelf && (
            <span className="flex items-center gap-0.5 text-xs text-bark-400">
              <MapPin size={9} className="flex-shrink-0" />
              {book.shelf}
            </span>
          )}
          {book.philosophical_school && (
            <span className="tag-pill truncate max-w-[120px]">
              {book.philosophical_school}
            </span>
          )}
          {book.time_period && !book.philosophical_school && (
            <span className="tag-pill">{book.time_period}</span>
          )}

          {/* Score badge for search results */}
          {score !== undefined && (
            <span className="ml-auto text-xs font-medium text-moss-600 bg-moss-500/10 px-1.5 py-0.5 rounded-full">
              {(score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Star rating */}
        {book.rating && (
          <div className="mt-0.5">
            <StarRating rating={book.rating} size={11} readonly />
          </div>
        )}
      </div>
    </button>
  )
}

/** Skeleton placeholder card shown during loading */
export function BookCardSkeleton() {
  return (
    <div className="card p-3.5 flex gap-3 animate-pulse">
      <div className="skeleton w-14 h-20 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton h-3.5 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
        <div className="skeleton h-3 rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}
