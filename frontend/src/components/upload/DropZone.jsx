import { useState, useRef } from 'react'

export default function DropZone({ onFileSelect, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current.click()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
        ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-500 hover:bg-slate-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      {selectedFile ? (
        <div className="space-y-1">
          <div className="text-2xl">📄</div>
          <p className="font-medium text-slate-900 text-sm">{selectedFile.name}</p>
          <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          <button
            onClick={e => { e.stopPropagation(); setSelectedFile(null); onFileSelect(null) }}
            className="text-xs text-red-500 hover:text-red-700 underline mt-1"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <svg className="mx-auto w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-slate-700">Drop your CSV file here</p>
          <p className="text-xs text-slate-400">or click to browse</p>
          <p className="text-xs text-slate-400 mt-2">Supports IBM AML format and custom CSV files up to 100MB</p>
        </div>
      )}
    </div>
  )
}
