import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react'
import { uploadDataset } from '../api/datasetsApi.js'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB default

export default function DatasetUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [successData, setSuccessData] = useState(null)

  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setDragActive(false)
      setUploading(false)
      setUploadProgress(0)
      setError(null)
      setSuccessData(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleFileSelected(selectedFile) {
    setError(null)
    setSuccessData(null)

    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file format. Only .csv files are supported by the QSAR engine.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`)
      return
    }

    if (selectedFile.size === 0) {
      setError('The selected CSV file is empty.')
      return
    }

    setFile(selectedFile)
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  async function handleUpload() {
    if (!file || uploading) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await uploadDataset(
        file,
        (progress) => setUploadProgress(progress),
        controller.signal,
      )
      setSuccessData(result)
      onUploadSuccess?.(result)
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.message || 'Failed to upload dataset.')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleClose() {
    if (uploading && abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    onClose()
  }

  return (
    <div
      aria-labelledby="upload-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={uploading ? undefined : handleClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <UploadCloud aria-hidden="true" size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900" id="upload-modal-title">
                Register Chemical Dataset
              </h2>
              <p className="text-xs text-slate-500">
                Upload a structured tabular CSV containing compound structures and endpoints
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-700"
            disabled={uploading}
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {successData ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 aria-hidden="true" size={24} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-emerald-950">
                Dataset Registered Successfully
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                Saved as <span className="font-mono font-medium">{successData.original_filename}</span> ({successData.record_count} rows).
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                  onClick={handleClose}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-teal-600 bg-teal-50/50'
                    : file
                      ? 'border-teal-300 bg-slate-50/50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/70'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  ref={fileInputRef}
                  type="file"
                />

                <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <FileSpreadsheet aria-hidden="true" size={22} />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {file ? file.name : 'Choose a CSV file or drag & drop here'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : 'Standard UTF-8 CSV with SMILES, compound identifiers and activity data (max 10 MB)'}
                </p>
              </div>

              {/* Error feedback */}
              {error && (
                <div
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-rose-600" size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload progress */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-teal-600 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Requirements hint */}
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-700">Recommended CSV Columns:</p>
                <p className="mt-0.5">
                  <span className="font-mono text-slate-800">compound_id</span> (or ID),{' '}
                  <span className="font-mono text-slate-800">smiles</span> (chemical structure),{' '}
                  <span className="font-mono text-slate-800">activity</span> (numerical target),{' '}
                  <span className="font-mono text-slate-800">endpoint</span> (e.g. IC50, Ki), and{' '}
                  <span className="font-mono text-slate-800">units</span> (e.g. nM, µM).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!successData && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400"
              disabled={uploading}
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
              disabled={!file || uploading}
              onClick={handleUpload}
              type="button"
            >
              {uploading ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" size={14} />
                  Uploading...
                </>
              ) : (
                'Upload & Register'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
