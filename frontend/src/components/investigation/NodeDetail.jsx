import React from 'react';

const NodeDetail = ({ entity }) => {
  if (!entity) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mb-1">Type</p>
          <p className="text-sm font-semibold text-slate-900 capitalize">{entity.type || 'Unknown'}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mb-1">Location</p>
          <p className="text-sm font-semibold text-slate-900">{entity.country || entity.nationality || 'Unspecified'}</p>
        </div>
      </div>
      
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mb-1">Risk Profile</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Algorithmic Score</span>
          <span className="text-sm font-bold text-slate-900">{entity.risk_score?.toFixed(1) || 0}/100</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-slate-700">ML Prediction</span>
          <span className={`text-sm font-bold ${(entity.ml_prediction === 'FRAUD' || entity.ml_prediction === 'LAUNDERING') ? 'text-red-600' : 'text-emerald-600'}`}>
            {entity.ml_prediction || 'N/A'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identifiers</h4>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-600">ID</span>
          <span className="text-sm font-mono text-slate-900">{entity.id}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-600">Created</span>
          <span className="text-sm text-slate-900">{entity.created_year || 'Unknown'}</span>
        </div>
        {entity.pep && (
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">PEP Status</span>
            <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Active</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetail;
