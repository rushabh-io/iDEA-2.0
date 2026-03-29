export default function DataPreview({ preview, columns }) {
  if (!preview || preview.length === 0) return null

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">Showing first {preview.length} rows</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.slice(0, 6).map(col => (
                <th key={col} className="text-left px-3 py-2 text-slate-600 font-medium whitespace-nowrap">{col}</th>
              ))}
              {columns.length > 6 && <th className="px-3 py-2 text-slate-400">+{columns.length - 6} more</th>}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {columns.slice(0, 6).map(col => (
                  <td key={col} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-32 overflow-hidden text-ellipsis">
                    {String(row[col] ?? '')}
                  </td>
                ))}
                {columns.length > 6 && <td className="px-3 py-2 text-slate-300">...</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
