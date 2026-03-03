import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { books as booksApi } from '../lib/api'
import { toastSuccess, toastError } from '../lib/toast'

interface Props {
  onImported: () => void
}

export function ImportPanel({ onImported }: Props) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setImporting(true)
    setResult(null)
    try {
      const r = await booksApi.importCSV(file)
      setResult(r)
      if (r.imported > 0) {
        onImported()
        toastSuccess(`Imported ${r.imported} book${r.imported !== 1 ? 's' : ''}`)
      }
    } catch {
      setResult({ imported: 0, skipped: 0, errors: ['Import failed – check the CSV format'] })
      toastError('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="panel-section">
      <h3 className="font-serif font-bold text-bark-800 flex items-center gap-2">
        <Upload size={14} className="text-bark-500" />
        Import CSV
      </h3>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => !importing && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
          transition-all duration-200
          ${dragging
            ? 'border-bark-500 bg-bark-400/5 scale-[0.99]'
            : importing
              ? 'border-cream-200 opacity-60 cursor-wait'
              : 'border-cream-200 hover:border-bark-400 hover:bg-cream-100'
          }
        `}
      >
        <FileText size={22} className="mx-auto text-bark-300 mb-2" />
        <p className="text-sm text-bark-600 font-medium">
          {importing ? 'Importing…' : dragging ? 'Drop to import' : 'Drop CSV or click to browse'}
        </p>
        <p className="text-xs text-bark-400 mt-1">Supports your Libib / Goodreads export format</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {result && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-moss-600">
            <CheckCircle size={14} />
            <span>
              <strong>{result.imported}</strong> imported
              {result.skipped > 0 && <>, <strong>{result.skipped}</strong> skipped</>}
            </span>
          </div>
          {result.errors.slice(0, 3).map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-rust-500">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
