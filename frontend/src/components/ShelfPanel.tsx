import { BookOpen } from 'lucide-react'
import type { ShelfInfo } from '../lib/types'
import clsx from 'clsx'

interface Props {
  shelves: ShelfInfo[]
  unassigned: number
  activeShelf: number | null
  onSelectShelf: (shelf: number | null) => void
  totalBooks?: number
}

export function ShelfPanel({ shelves, unassigned, activeShelf, onSelectShelf, totalBooks }: Props) {
  const populated = shelves.filter(s => s.count > 0)
  const maxCount = Math.max(...shelves.map(s => s.count), 1)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif font-bold text-bark-800 flex items-center gap-2">
          <BookOpen size={15} className="text-bark-500" /> Shelves
        </h2>
        <span className="text-xs text-bark-400">{populated.length} / 27</span>
      </div>

      {/* All books button */}
      <button
        onClick={() => onSelectShelf(null)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
          activeShelf === null
            ? 'shelf-chip-active text-cream-50'
            : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
        )}
      >
        <span>All Books</span>
        <span className={clsx(
          'text-xs px-2 py-0.5 rounded-full tabular-nums',
          activeShelf === null ? 'bg-cream-50/15 text-cream-100' : 'bg-cream-200 text-bark-500'
        )}>
          {totalBooks ?? shelves.reduce((a, s) => a + s.count, 0)}
        </span>
      </button>

      {/* Shelf grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
        {shelves.map(s => (
          <button
            key={s.shelf}
            onClick={() => onSelectShelf(s.shelf === activeShelf ? null : s.shelf)}
            className={clsx(
              'relative rounded-xl py-2 text-xs font-medium transition-all duration-150 text-center group',
              activeShelf === s.shelf
                ? 'shelf-chip-active text-cream-50'
                : s.count > 0
                  ? 'bg-cream-200 text-bark-700 hover:bg-bark-400 hover:text-cream-50'
                  : 'bg-cream-100 text-bark-300 hover:bg-cream-200 hover:text-bark-400'
            )}
            title={`Shelf ${s.shelf}: ${s.count} book${s.count !== 1 ? 's' : ''}`}
          >
            {/* Fill indicator bar */}
            {s.count > 0 && activeShelf !== s.shelf && (
              <span
                className="absolute bottom-0 left-0 right-0 bg-bark-400/20 rounded-b-xl"
                style={{ height: `${(s.count / maxCount) * 30}%` }}
              />
            )}
            <div className="relative font-bold">{s.shelf}</div>
            <div className={clsx(
              'relative text-[10px] mt-0.5 tabular-nums',
              activeShelf === s.shelf ? 'text-cream-200' : 'text-bark-400 group-hover:text-cream-100'
            )}>
              {s.count}
            </div>
          </button>
        ))}
      </div>

      {unassigned > 0 && (
        <p className="text-xs text-bark-400">{unassigned} unassigned</p>
      )}
    </div>
  )
}
