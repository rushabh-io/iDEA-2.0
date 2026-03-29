import React from 'react';
import { motion } from 'framer-motion';

const GraphControls = ({ activeView, onFilterChange, onSearch, onZoomIn, onZoomOut, onFit, onSimulateAttack }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-14 bg-white/70 backdrop-blur-xl border-b border-white/60 flex items-center justify-between px-6 shrink-0 shadow-sm z-10 w-full"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700 mr-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Views:
        </span>
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-300 ${activeView === 'all'
            ? 'bg-brand-50 text-brand-700 border-brand-200/60 shadow-sm hover:-translate-y-0.5'
            : 'bg-white/60 text-slate-600 border-slate-200/60 hover:bg-white hover:shadow-sm hover:-translate-y-0.5'
            }`}
        >
          All Network
        </button>
        {/* <button
          onClick={() => onFilterChange('suspicious')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-300 ${activeView === 'suspicious'
              ? 'bg-brand-50 text-brand-700 border-brand-200/60 shadow-sm hover:-translate-y-0.5'
              : 'bg-white/60 text-slate-600 border-slate-200/60 hover:bg-white hover:shadow-sm hover:-translate-y-0.5'
            }`}
        >
          Suspicious Subgraphs
        </button>
        <button
          onClick={() => onFilterChange('ownership')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-300 ${activeView === 'ownership'
              ? 'bg-brand-50 text-brand-700 border-brand-200/60 shadow-sm hover:-translate-y-0.5'
              : 'bg-white/60 text-slate-600 border-slate-200/60 hover:bg-white hover:shadow-sm hover:-translate-y-0.5'
            }`}
        >
          Ownership Only
        </button>
        <button
          onClick={() => onFilterChange('live')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-300 ${activeView === 'live'
              ? 'bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm hover:-translate-y-0.5'
              : 'bg-white/60 text-slate-600 border-slate-200/60 hover:bg-white hover:shadow-sm hover:-translate-y-0.5'
            }`}
        >
          Live Only
        </button> */}
      </div>

      <div className="flex items-center gap-4">
        {onSimulateAttack && (
          <button
            onClick={onSimulateAttack}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-xl shadow-sm hover:bg-amber-600 hover:shadow-md transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Simulate Attack
          </button>
        )}
        <div className="relative group">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Entity ID (Enter)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-9 pr-4 py-1.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-64 transition-all duration-300 placeholder-slate-400 backdrop-blur-sm shadow-inner"
          />
        </div>

        <div className="h-6 w-px bg-slate-200/60 mx-1"></div>

        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 shadow-inner">
          <button
            title="Zoom In"
            onClick={onZoomIn}
            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-white hover:shadow-sm hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          <button
            title="Zoom Out"
            onClick={onZoomOut}
            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-white hover:shadow-sm hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
          </button>
          <button
            title="Fit bounds"
            onClick={onFit}
            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-white hover:shadow-sm hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GraphControls;
