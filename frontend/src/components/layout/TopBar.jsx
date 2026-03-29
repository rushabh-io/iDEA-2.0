import React from 'react';
import { motion } from 'framer-motion';

const TopBar = ({ activeTab, onTabChange, onDetect, onSimulate, detecting, onAnalyseClick, analysisMode, backendOnline, copilotOpen, onToggleCopilot }) => {
  return (
    <div className="h-16 shrink-0 z-20 w-full border-b border-slate-200/40 bg-white/70 backdrop-blur-md flex items-center justify-between px-6 transition-all duration-300">
      {/* Logo Area */}
      <div className="flex items-center gap-3 group cursor-pointer">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-glow shadow-brand-500/30 group-hover:scale-105 transition-all">
          N
        </div>
        <span className="font-bold text-slate-800 tracking-tight text-xl group-hover:text-brand-600 transition-colors">Nexara</span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center h-full absolute left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50">
          {['dashboard', 'investigation', 'cases'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-5 py-1.5 font-medium text-sm rounded-full transition-colors relative z-10 ${
                activeTab === tab 
                  ? 'text-brand-700' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab-topbar"
                  className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm border border-slate-200/60"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!analysisMode && (
          <>
            {/* Upload Data (Analysis Mode) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAnalyseClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200/50 rounded-full hover:bg-brand-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Data
            </motion.button>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mr-2 ml-1" title={backendOnline === null ? 'Checking...' : backendOnline ? 'Backend Online' : 'Backend Offline (using cached data)'}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                detecting ? 'bg-amber-500 animate-pulse' : 
                backendOnline === false ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                backendOnline === null ? 'bg-amber-400 animate-pulse' :
                'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              }`}></div>
            </div>

            <motion.button 
              whileHover={!detecting ? { scale: 1.02 } : {}}
              whileTap={!detecting ? { scale: 0.98 } : {}}
              onClick={onSimulate}
              disabled={detecting}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200/80 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simulate
            </motion.button>
            <motion.button 
              whileHover={!detecting ? { scale: 1.02 } : {}}
              whileTap={!detecting ? { scale: 0.98 } : {}}
              onClick={onDetect}
              disabled={detecting}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {detecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </>
              ) : 'Run Detection'}
            </motion.button>
          </>
        )}
        
        {analysisMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-4 py-1.5 rounded-full border border-amber-200 shadow-sm backdrop-blur-sm">
              ANALYSIS MODE
            </span>
          </motion.div>
        )}

        {/* Co-pilot Toggle */}
        <div className="h-6 w-px bg-slate-200/60 mx-1"></div>
        <button
          onClick={onToggleCopilot}
          className={`p-2 rounded-xl transition-all duration-300 relative group flex items-center justify-center ${copilotOpen ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
          title="Investigator Co-pilot"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
