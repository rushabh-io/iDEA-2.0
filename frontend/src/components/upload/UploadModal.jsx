import { useState, useEffect, useCallback } from 'react'
import DropZone from './DropZone'
import ColumnMapper from './ColumnMapper'
import DataPreview from './DataPreview'
import UploadProgress from './UploadProgress'
import { previewCSV, importCSV, downloadTemplate } from '../../api/client'

export default function UploadModal({ onClose, onImportComplete }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [mapping, setMapping] = useState({})
  const [formatDetected, setFormatDetected] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progressStage, setProgressStage] = useState('parsing')
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // ESC to close only in steps 1 and 2
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && step <= 2 && !importing) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [step, importing, onClose])

  // Handle file selection → auto-preview
  const handleFileSelect = useCallback(async (selectedFile) => {
    setError(null)
    if (!selectedFile) { setFile(null); setPreviewData(null); return }
    setFile(selectedFile)

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size is 100MB')
      return
    }
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Only CSV files are supported')
      return
    }

    setLoadingPreview(true)
    try {
      const res = await previewCSV(selectedFile)
      const data = res.data || res
      setPreviewData(data)
      setFormatDetected(data.format_detected)
      setMapping(data.auto_mapping || {})
      setValidationResult(data.validation)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to preview CSV')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  // Handle import
  const handleImport = useCallback(async () => {
    if (!file) return
    setImporting(true)
    setError(null)
    setStep(3)
    setProgressStage('parsing')

    // Start actual import
    try {
      const mappingToSend = formatDetected === 'ibm' ? null : mapping
      const res = await importCSV(file, mappingToSend)
      const data = res.data || res

      setProgressStage('done')
      setImportResult({
        accounts_loaded: data.load_summary?.accounts_loaded || 0,
        transactions_loaded: data.load_summary?.transactions_loaded || 0,
        laundering_transactions: data.load_summary?.laundering_transactions || 0,
        total_alerts: data.auto_detection?.total_alerts || 0,
      })

      setTimeout(() => setStep(4), 800)
    } catch (err) {
      stageTimers.forEach(clearTimeout)
      setError(err.response?.data?.detail || 'Import failed')
      setStep(2)
      setImporting(false)
    }
  }, [file, mapping, formatDetected])

  // Reset to start
  const handleReset = () => {
    setStep(1); setFile(null); setPreviewData(null); setMapping({})
    setFormatDetected(''); setValidationResult(null); setImporting(false)
    setProgressStage('parsing'); setImportResult(null); setError(null)
  }

  const hasValidationErrors = validationResult && !validationResult.valid

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
        <div className="p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {step === 1 && 'Upload Transaction Data'}
                {step === 2 && 'Review & Map Columns'}
                {step === 3 && 'Importing Data'}
                {step === 4 && 'Import Complete'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 && 'Import your CSV to analyze in Nexara'}
                {step === 2 && `${previewData?.total_rows?.toLocaleString()} rows · ${previewData?.columns?.length} columns · ${formatDetected === 'ibm' ? 'IBM Format' : 'Custom Format'}`}
                {step === 3 && 'Please wait while your data is processed...'}
                {step === 4 && 'Your data has been loaded and analyzed'}
              </p>
            </div>
            {step <= 2 && !importing && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠</span>
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
                {step !== 1 && (
                  <button onClick={handleReset} className="text-red-600 underline text-xs mt-1 hover:text-red-800">Try again</button>
                )}
              </div>
            </div>
          )}

          {/* Step 1 — File Drop */}
          {step === 1 && (
            <div className="space-y-4">
              <DropZone onFileSelect={handleFileSelect} disabled={loadingPreview} />
              {loadingPreview && (
                <div className="text-center text-sm text-brand-600 animate-pulse">Analyzing file...</div>
              )}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={downloadTemplate}
                  className="text-xs text-slate-500 hover:text-brand-600 underline transition-colors"
                >
                  Download CSV template
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Column Mapping + Preview */}
          {step === 2 && previewData && (
            <div className="space-y-6">
              {/* Format badge */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  formatDetected === 'ibm'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-brand-100 text-brand-700 border border-brand-200'
                }`}>
                  {formatDetected === 'ibm' ? '✓ IBM AML Format Detected' : 'Custom Format'}
                </span>
              </div>

              {/* Validation warnings */}
              {validationResult?.warnings?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {validationResult.warnings.map((w, i) => (
                    <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-md">{w}</span>
                  ))}
                </div>
              )}

              {/* Column Mapper (only for non-IBM) */}
              {formatDetected !== 'ibm' ? (
                <ColumnMapper
                  csvColumns={previewData.columns}
                  autoMapping={previewData.auto_mapping}
                  onMappingChange={setMapping}
                />
              ) : (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">IBM AML format detected — all columns mapped automatically</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-green-700">
                    {Object.entries(previewData.auto_mapping || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        <span className="font-medium">{k}</span> → {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              <DataPreview preview={previewData.preview} columns={previewData.columns} />

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setStep(1); setPreviewData(null); setFile(null) }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={hasValidationErrors}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    hasValidationErrors
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                  }`}
                >
                  Import {previewData.total_rows?.toLocaleString()} rows
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Import Progress */}
          {step === 3 && (
            <UploadProgress stage={progressStage} result={null} />
          )}

          {/* Step 4 — Success */}
          {step === 4 && (
            <div className="space-y-6">
              <UploadProgress stage="done" result={importResult} />
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Upload Another
                </button>
                <button
                  onClick={() => { onImportComplete(); onClose() }}
                  className="px-6 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm transition-colors"
                >
                  View in Graph
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
