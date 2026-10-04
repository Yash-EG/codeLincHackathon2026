import { useId, useRef, useState, type DragEvent } from 'react'
import { FileText, FileUp, TriangleAlert } from 'lucide-react'
import { announce } from '../store/uiStore'
import { buttonPrimary, buttonQuiet, buttonSecondary } from './ui'

const MAX_BYTES = 10 * 1024 * 1024

const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/**
 * Drop zone for a summary-of-benefits PDF. Drag and drop or "Choose PDF" both
 * work, and the file is checked (PDF, 10 MB). There is no service that reads
 * PDFs yet, so it says so plainly and hands off to manual entry. The file never
 * leaves the browser.
 */
export default function PdfDropzone({ onEnterManually }: { onEnterManually: () => void }) {
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function accept(next: File | undefined) {
    if (!next) return
    if (next.type !== 'application/pdf' && !/\.pdf$/i.test(next.name)) {
      setError(`${next.name} isn't a PDF. Choose your summary of benefits as a .pdf file.`)
      return
    }
    if (next.size > MAX_BYTES) {
      setError(`${next.name} is ${sizeLabel(next.size)}. Choose a PDF up to 10 MB.`)
      return
    }
    setError(null)
    setFile(next)
    announce(`${next.name} attached. Automatic reading isn't available yet, so enter the numbers from it.`)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    accept(event.dataTransfer.files[0])
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-sm border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/[0.04]' : 'border-rule bg-paper/50'
        }`}
      >
        <FileUp className={`mx-auto size-6 ${dragging ? 'text-primary' : 'text-ink-muted'}`} aria-hidden="true" />
        <p className="mt-3 font-serif text-xl text-ink">
          {dragging ? 'Drop the PDF to attach it' : 'Drop your summary of benefits here'}
        </p>
        <p id={hintId} className="mt-1 text-sm text-ink-muted">
          PDF, up to 10 MB. It stays in this browser.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
          className={`${buttonSecondary} mt-5`}
        >
          Choose PDF
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 border-l-2 border-danger py-1 pl-3 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {file && (
        <div className="border-t-2 border-ink">
          <div className="flex items-center gap-3 border-b border-line py-2">
            <FileText className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-sm text-ink">
              {file.name} <span className="font-mono text-ink-muted">· {sizeLabel(file.size)}</span>
            </p>
            <button
              type="button"
              className={buttonQuiet}
              onClick={() => {
                setFile(null)
                announce('PDF removed.')
              }}
            >
              Remove<span className="sr-only"> {file.name}</span>
            </button>
          </div>
          <p className="mt-4 text-sm text-ink">
            Automatic reading isn&rsquo;t available yet. Enter the numbers from it below: the annual maximum, deductible
            and what each kind of care is covered at are usually on the first page.
          </p>
          <button type="button" className={`${buttonPrimary} mt-4`} onClick={onEnterManually}>
            Enter the numbers
          </button>
        </div>
      )}
    </div>
  )
}
