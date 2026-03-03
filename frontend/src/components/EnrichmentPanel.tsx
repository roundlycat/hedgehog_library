import { useState } from 'react'
import { Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { EnrichStatus } from '../lib/types'
import { enrichment, type EnrichProgressEvent } from '../lib/api'
import { toastSuccess, toastError } from '../lib/toast'

interface Props {
  status: EnrichStatus | null
  onComplete: () => void
}

interface ProgressItem {
  title: string
  status: 'ok' | 'error'
  message?: string
}

export function EnrichmentPanel({ status, onComplete }: Props) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [items, setItems] = useState<ProgressItem[]>([])
  const [done, setDone] = useState(false)

  const handleStart = async (force = false) => {
    setRunning(true)
    setItems([])
    setDone(false)
    setProgress(null)

    try {
      await enrichment.startEnrich(
        (event: EnrichProgressEvent) => {
          if (event.type === 'start') {
            setProgress({ done: 0, total: event.total! })
          } else if (event.type === 'progress') {
            setProgress(p => p ? { ...p, done: event.index! } : null)
            setItems(prev => [...prev.slice(-19), {
              title: event.title!,
              status: event.status!,
              message: event.message,
            }])
          } else if (event.type === 'done') {
            setDone(true)
            setRunning(false)
            onComplete()
            toastSuccess('Enrichment complete!')
          }
        },
        undefined,
        force
      )
    } catch {
      setRunning(false)
      toastError('Enrichment failed')
    }
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="panel-section">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-bark-800 flex items-center gap-2">
          <Sparkles size={15} className="text-rust-400" />
          AI Enrichment
        </h3>
        {status && (
          <div className="text-right">
            <div className="text-xs font-semibold text-bark-700 tabular-nums">
              {status.enriched}<span className="text-bark-400">/{status.total}</span>
            </div>
            <div className="text-[10px] text-bark-400">enriched</div>
          </div>
        )}
      </div>

      {/* Mini progress bar (overall) */}
      {status && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(status.enriched / Math.max(status.total, 1)) * 100}%` }}
          />
        </div>
      )}

      {status && status.pending > 0 && !running && !done && (
        <p className="text-xs text-bark-600">
          {status.pending} book{status.pending !== 1 ? 's' : ''} need enrichment
          <span className="text-bark-400"> (tags, periods, related authors)</span>
        </p>
      )}

      {/* Active progress */}
      {running && progress && (
        <div>
          <div className="flex justify-between text-xs text-bark-500 mb-1.5">
            <span className="tabular-nums">{progress.done} / {progress.total}</span>
            <span className="tabular-nums font-medium">{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Recent items log */}
      {items.length > 0 && (
        <div className="max-h-36 overflow-y-auto space-y-1 bg-cream-100 rounded-xl p-2">
          {[...items].reverse().map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {item.status === 'ok'
                ? <CheckCircle size={11} className="text-moss-500 flex-shrink-0" />
                : <XCircle size={11} className="text-rust-400 flex-shrink-0" />
              }
              <span className="text-bark-700 line-clamp-1">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {done && (
        <p className="text-sm text-moss-600 font-medium flex items-center gap-1.5">
          <CheckCircle size={14} /> Enrichment complete
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        {status && status.pending > 0 && !running && (
          <button
            onClick={() => handleStart(false)}
            className="btn-primary text-sm gap-1.5"
          >
            <Sparkles size={13} />
            Enrich {status.pending} pending
          </button>
        )}
        {!running && status && status.enriched > 0 && (
          <button onClick={() => handleStart(true)} className="btn-secondary text-sm">
            Re-enrich all
          </button>
        )}
        {running && (
          <span className="flex items-center gap-1.5 text-sm text-bark-600">
            <Loader2 size={13} className="animate-spin" /> Running…
          </span>
        )}
      </div>
    </div>
  )
}
