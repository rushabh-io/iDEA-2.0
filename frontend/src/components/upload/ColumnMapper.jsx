import { useState } from 'react'

const NEXARA_FIELDS = [
  { key: 'from_account',      label: 'Sender Account ID',   required: true },
  { key: 'to_account',        label: 'Receiver Account ID', required: true },
  { key: 'amount',            label: 'Transaction Amount',  required: true },
  { key: 'date',              label: 'Transaction Date',    required: false },
  { key: 'currency',          label: 'Currency',            required: false },
  { key: 'from_bank',         label: 'Sender Bank ID',      required: false },
  { key: 'to_bank',           label: 'Receiver Bank ID',    required: false },
  { key: 'transaction_type',  label: 'Transaction Type',    required: false },
  { key: 'is_laundering',     label: 'Fraud Label (0/1)',   required: false },
]

export default function ColumnMapper({ csvColumns, autoMapping, onMappingChange }) {
  const [mapping, setMapping] = useState(autoMapping || {})

  function handleChange(nexaraField, csvColumn) {
    const updated = { ...mapping, [nexaraField]: csvColumn }
    if (!csvColumn) delete updated[nexaraField]
    setMapping(updated)
    onMappingChange(updated)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3">
        Map your CSV columns to Nexara fields. Required fields are marked with <span className="text-red-500">*</span>
      </p>
      {NEXARA_FIELDS.map(field => (
        <div key={field.key} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
          <div className="w-44 flex-shrink-0">
            <span className="text-sm text-slate-700">{field.label}</span>
            {field.required && <span className="text-red-500 ml-1 text-xs">*</span>}
          </div>
          <div className="text-slate-300 text-sm">→</div>
          <select
            value={mapping[field.key] || ''}
            onChange={e => handleChange(field.key, e.target.value)}
            className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">— not mapped —</option>
            {csvColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {mapping[field.key] && <span className="text-green-500 text-xs flex-shrink-0">✓</span>}
        </div>
      ))}
    </div>
  )
}
