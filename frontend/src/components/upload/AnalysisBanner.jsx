import React from 'react';
import { motion } from 'framer-motion';

export default function AnalysisBanner({
  filename, rowCount, onStop, onRunDetection,
  detecting, hasDetectionRan
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-amber-50/90 to-amber-100/90 backdrop-blur-md border-b border-amber-200/60 px-6 py-2.5 flex items-center justify-between shadow-sm z-30"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-3 h-3">
          <div className="absolute w-full h-full bg-amber-400 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
        <span className="text-sm font-bold text-amber-900 tracking-tight">
          Analysis Mode:
        </span>
        <span className="text-sm text-amber-800 font-mono font-bold bg-white/50 px-2 py-0.5 rounded shadow-sm border border-amber-200/50">
          {filename}
        </span>
        <span className="text-xs font-semibold text-amber-600/80">
          ({rowCount?.toLocaleString()} events)
        </span>
        <div className="h-4 w-px bg-amber-200 mx-1"></div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-200/50 text-amber-700 px-2 py-0.5 rounded shadow-sm">
          Isolated Environment
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {!hasDetectionRan && (
          <button
            onClick={onRunDetection}
            disabled={detecting}
            className="px-4 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg shadow-sm shadow-amber-600/20 hover:bg-amber-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {detecting ? 'Analysing...' : 'Run Network Detection'}
          </button>
        )}
        {hasDetectionRan && (
          <button
            onClick={onRunDetection}
            disabled={detecting}
            className="px-4 py-1.5 text-xs font-bold border border-amber-300/80 bg-white/60 text-amber-700 rounded-lg shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {detecting ? 'Re-analysing...' : 'Re-run Detection'}
          </button>
        )}
        <button
          onClick={onStop}
          className="px-4 py-1.5 text-xs font-bold bg-white border border-red-200 text-red-600 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-700 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          Exit Mode
        </button>
      </div>
    </motion.div>
  );
}
