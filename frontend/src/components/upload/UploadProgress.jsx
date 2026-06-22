export default function UploadProgress({ stage, result }) {
  const stages = [
    { key: 'parsing',   label: 'Validating 500 rows...', description: 'Step 1: Parsing and validating CSV data' },
    { key: 'loading',   label: 'Loading accounts into Neo4j graph...', description: 'Step 2: Loading into Neo4j graph' },
    { key: 'ownership', label: 'Building ownership network...', description: 'Step 3: Building ownership network' },
    { key: 'detecting', label: 'Running 6 fraud detectors...', description: 'Step 4: Running detection algorithms' },
    { key: 'done',      label: 'Complete', description: 'Step 5: Complete' },
  ]

  const currentIndex = stages.findIndex(s => s.key === stage)

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-3">
        {stages.map((s, i) => {
          const isDone    = i < currentIndex
          const isCurrent = i === currentIndex
          return (
            <div key={s.key} className="flex items-start gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5
                ${isDone ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}
              `}>
                {isDone ? '✓' : isCurrent ? (i + 1) : (i + 1)}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDone ? 'text-green-600' : isCurrent ? 'text-brand-600' : 'text-slate-400'}`}>
                  {s.description}
                </p>
                {isCurrent && (
                  <p className="text-xs text-brand-500 mt-0.5 font-semibold animate-pulse">
                    {s.label}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {result && stage === 'done' && (
        <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm font-bold text-emerald-800 mb-3">Import Successful</p>
          <div className="grid grid-cols-2 gap-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Accounts loaded: <span className="font-semibold ml-1">{result.accounts_loaded}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Transactions loaded: <span className="font-semibold ml-1">{result.transactions_loaded}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Alerts detected: <span className="font-semibold ml-1">{result.total_alerts}</span></span>
            </div>
            {result.laundering_transactions > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Labeled fraud: <span className="font-semibold ml-1">{result.laundering_transactions}</span></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
