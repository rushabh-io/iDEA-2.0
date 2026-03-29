export default function UploadProgress({ stage, result }) {
  const stages = [
    { key: 'parsing',   label: 'Parsing CSV' },
    { key: 'loading',   label: 'Loading into graph database' },
    { key: 'ownership', label: 'Building ownership network' },
    { key: 'detecting', label: 'Running detection algorithms' },
    { key: 'done',      label: 'Complete' },
  ]

  const currentIndex = stages.findIndex(s => s.key === stage)

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-3">
        {stages.map((s, i) => {
          const isDone    = i < currentIndex
          const isCurrent = i === currentIndex
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                ${isDone ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}
              `}>
                {isDone ? '✓' : isCurrent ? '◌' : '○'}
              </div>
              <span className={`text-sm ${isDone ? 'text-green-600' : isCurrent ? 'text-brand-600 font-medium' : 'text-slate-400'}`}>
                {s.label}
                {isCurrent && <span className="ml-2 text-xs animate-pulse">...</span>}
              </span>
            </div>
          )
        })}
      </div>

      {result && stage === 'done' && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-green-800 mb-2">Import successful</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>Accounts loaded: <span className="font-semibold ml-1">{result.accounts_loaded}</span></div>
            <div>Transactions loaded: <span className="font-semibold ml-1">{result.transactions_loaded}</span></div>
            <div>Alerts detected: <span className="font-semibold ml-1">{result.total_alerts}</span></div>
            {result.laundering_transactions > 0 && (
              <div>Labeled fraud: <span className="font-semibold ml-1">{result.laundering_transactions}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
