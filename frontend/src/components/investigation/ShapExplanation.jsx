import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getShapExplanation } from '../../api/client';

const ShapExplanation = ({ accountId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    getShapExplanation(accountId)
      .then(res => {
        if (res.error) setError(res.error);
        else setData(res.explanation);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <div className="bg-white/50 border border-slate-200/60 p-4 rounded-xl animate-pulse flex flex-col gap-3 mt-4">
        <div className="h-4 bg-slate-200/50 w-1/3 rounded"></div>
        <div className="h-2 bg-slate-200/50 w-full rounded"></div>
        <div className="h-2 bg-slate-200/50 w-2/3 rounded"></div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    // If not found or error, just silently hide for clean UI
    return null; 
  }

  return (
    <div className="bg-slate-50/80 backdrop-blur-sm border border-orange-200/60 rounded-xl p-4 shadow-sm mt-4">
      <h4 className="text-xs font-bold text-slate-700 tracking-wide uppercase mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Top 3 Risk Factors (SHAP)
      </h4>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span className="uppercase">{item.feature.replace(/_/g, ' ')}</span>
              <span className={item.shap_value > 0 ? 'text-red-600' : 'text-emerald-600'}>
                {item.shap_value > 0 ? '+' : ''}{item.shap_value.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.abs(item.shap_value) * 100, 100)}%` }}
                transition={{ duration: 1 }}
                className={`h-full ${item.shap_value > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShapExplanation;
