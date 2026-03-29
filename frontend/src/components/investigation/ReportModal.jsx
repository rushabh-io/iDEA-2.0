import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReport, getSAR } from '../../api/client';

const ReportModal = ({ entity, onClose, createReportFn, addToast }) => {
  const [reportType, setReportType] = useState('profile'); // profile or sar
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (createReportFn) {
        // Use injected function (Analysis Mode)
        res = await createReportFn(entity.id);
      } else {
        // Default Neo4j/IBM logic
        const fn = reportType === 'profile' ? getReport : getSAR;
        res = await fn(entity.id);
      }
      
      // liveOrMock already unwraps .data, so res IS the data object
      const text = res?.report_text || res?.sar_text || res?.report || res?.data?.report_text || res?.data?.sar_text || null;
      if (text) {
         setReport(text);
      } else if (res?.error) {
         setError(res.error);
      } else {
         setError("Generation returned empty results.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to AI Service. Check your Auth Key and network.");
    } finally {
      setLoading(false);
    }
  };

  const nameToDisplay = entity.type === 'Person' ? entity.name : entity.id;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
          className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 rounded-xl shadow-inner ring-1 ring-brand-200/50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight leading-loose">Automated Reporting</h2>
                <p className="text-sm font-semibold text-slate-500 mt-0.5 font-mono opacity-80">ID: {nameToDisplay}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30 custom-scrollbar">
            {!report && !loading && !error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl p-4 flex gap-3.5 text-blue-800 shadow-sm">
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-medium leading-relaxed tracking-wide">Select a report type to generate context-aware documentation powered by AI. The system will analyze the entity's graph neighborhood, transaction history, and alerted typologies.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div 
                    className={`relative overflow-hidden border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 ${reportType === 'profile' ? 'border-brand-500 bg-brand-50/50 shadow-md transform -translate-y-1' : 'border-slate-200/80 hover:border-brand-300 hover:bg-slate-50/50 hover:shadow-sm bg-white/60'}`}
                    onClick={() => setReportType('profile')}
                  >
                    {reportType === 'profile' && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-brand-300/20 to-brand-100/0 rounded-bl-full pointer-events-none"></div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight">Compliance Profile</h3>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${reportType === 'profile' ? 'border-brand-500' : 'border-slate-300'}`}>
                        {reportType === 'profile' && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">A concise, 100-word overview of the entity's risk level, key flags, and recommended immediate actions.</p>
                  </div>
                  
                  <div 
                    className={`relative overflow-hidden border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 ${reportType === 'sar' ? 'border-brand-500 bg-brand-50/50 shadow-md transform -translate-y-1' : 'border-slate-200/80 hover:border-brand-300 hover:bg-slate-50/50 hover:shadow-sm bg-white/60'}`}
                    onClick={() => setReportType('sar')}
                  >
                    {reportType === 'sar' && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-brand-300/20 to-brand-100/0 rounded-bl-full pointer-events-none"></div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight">SAR Draft</h3>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${reportType === 'sar' ? 'border-brand-500' : 'border-slate-300'}`}>
                        {reportType === 'sar' && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">A dense, formal 350-word Suspicious Activity Report narrative formatted for regulatory filing structures.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                 <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 bg-brand-50 rounded-full flex items-center justify-center">
                       <div className="w-2 h-2 bg-brand-400 rounded-full animate-ping"></div>
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Analyzing Graph Topologies...</h3>
                 <p className="text-slate-500 font-medium bg-slate-100/80 px-4 py-1.5 rounded-full text-sm">Generating formal draft via AI Engine</p>
              </motion.div>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50/80 backdrop-blur-sm border border-red-200 shadow-sm text-red-700 p-6 rounded-2xl flex flex-col items-start"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-full">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h4 className="text-lg font-bold">Generation Failed</h4>
                </div>
                <p className="text-sm font-medium opacity-90 mb-5">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="px-5 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl text-sm font-bold shadow-sm hover:bg-red-50 hover:shadow transition-all duration-200"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {report && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500 border border-slate-200/80 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                     Generated Document
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                    AI Authored
                  </span>
                </div>
                <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 sm:p-8 font-serif text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap shadow-inner overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200"></div>
                  {report}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200/60 bg-white/60 backdrop-blur-md flex justify-end gap-3 rounded-b-3xl">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            >
              {report ? 'Close' : 'Cancel'}
            </button>
            {!report && !loading && (
               <button 
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Generate Draft
              </button>
            )}
            {report && (
               <button 
                onClick={() => {
                  navigator.clipboard.writeText(report);
                  if (addToast) addToast("Report copied to clipboard", "success");
                }}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v8m-6 4h4" /></svg>
                Copy Text
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportModal;
