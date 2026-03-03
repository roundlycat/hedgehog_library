/**
 * BookCover: Fetches a book cover from Open Library using ISBN.
 * Falls back to a styled text placeholder with the first letter of the title.
 */
import { useState } from 'react'
import type { Book } from '../lib/types'

interface Props {
    book: Book
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const SPINE_COLORS = [
    'from-bark-700 to-bark-900',
    'from-moss-600 to-moss-700',
    'from-rust-500 to-rust-600',
    'from-bark-500 to-bark-700',
    'from-moss-500 to-moss-700',
    'from-rust-400 to-rust-600',
]

function getSpineColor(title: string) {
    let hash = 0
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff
    }
    return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length]
}

export function BookCover({ book, size = 'md', className = '' }: Props) {
    const [imgError, setImgError] = useState(false)

    const isbn = book.isbn13 || book.isbn10
    const coverUrl = isbn && !imgError
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
        : null

    const sizeClasses = {
        sm: 'w-10 h-14 text-lg',
        md: 'w-14 h-20 text-2xl',
        lg: 'w-20 h-28 text-3xl',
    }[size]

    const color = getSpineColor(book.title)

    if (coverUrl) {
        return (
            <div className={`relative flex-shrink-0 overflow-hidden rounded-md shadow-sm ${sizeClasses} ${className}`}>
                <img
                    src={coverUrl}
                    alt={book.title}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                />
            </div>
        )
    }

    const initial = book.title.replace(/^(The|A|An)\s+/i, '').charAt(0).toUpperCase()

    return (
        <div className={`
      flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md shadow-sm
      bg-gradient-to-b ${color} ${sizeClasses} ${className}
    `}>
            <span className="font-serif font-bold text-cream-200/80 select-none">{initial}</span>
        </div>
    )
}
