import React from 'react';

const AlertPanel = ({ alerts = [], onReview }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-red-900">Active Alerts</h3>
        <span className="bg-red-100 text-red-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
          {alerts.length} found
        </span>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            No active alerts for this entity.
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div key={idx} onClick={onReview} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-slate-900 text-sm">{alert.pattern}</span>
                <span className="text-xs font-mono text-slate-500">{alert.date}</span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{alert.description}</p>
              <div className="mt-2 flex items-center space-x-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  alert.severity === 'High' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {alert.severity} Risk
                </span>
                <span className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Review &rarr;
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
