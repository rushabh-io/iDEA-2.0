import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { previewForAnalysis, uploadForAnalysis, downloadTemplate } from '../../api/client';

export default function AnalysisUploadModal({ onClose, onUploadComplete }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    try {
      const response = await previewForAnalysis(selectedFile);
      setPreviewData(response.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to analyze file. Check column format.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleStartAnalysis = async () => {
    setUploading(true);
    setError(null);
    setStep(3);
    try {
      const response = await uploadForAnalysis(file);
      onUploadComplete(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis session failed to start");
      setStep(2);
    } finally {
      setUploading(false);
    }
  };

  const resolvedFields = previewData?.resolved_fields || {};
  const appliedDefaults = previewData?.applied_defaults || {};
  const unmappedCols = previewData?.unmapped_columns || [];
  const allResolved = Object.keys(resolvedFields).length > 0;

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
          transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          className="bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/40">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 rounded-xl shadow-inner ring-1 ring-brand-200/50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Analyse Custom Data</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Upload any bank CSV/JSON — auto-standardized for analysis</p>
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
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/30 custom-scrollbar relative">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 text-sm rounded-2xl flex justify-between items-center shadow-sm"
              >
                <div className="flex items-center gap-3 font-medium">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
                <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 text-blue-700 text-xs font-bold rounded-full w-fit shadow-sm uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  Your Neo4j data will not be modified
                </div>
                
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group relative border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all duration-300 bg-white/50"
                  onClick={() => document.getElementById('analysis-file-input').click()}
                >
                  <div className="w-20 h-20 mx-auto bg-slate-100 group-hover:bg-brand-100 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 shadow-inner ring-1 ring-slate-200 group-hover:ring-brand-200">
                    <svg className="w-10 h-10 text-slate-400 group-hover:text-brand-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-slate-800 tracking-tight">
                    Drop any bank file here or <span className="text-brand-600 group-hover:text-brand-700">browse</span>
                  </p>
                  <p className="text-sm font-medium text-slate-500 mt-2">
                    CSV, JSON, TSV, XLSX · Max 100MB
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500/80 mt-4 bg-brand-50 inline-block px-3 py-1 rounded-full border border-brand-100">
                    Any bank format — auto-standardized
                  </p>
                  <input 
                    id="analysis-file-input" 
                    type="file" 
                    accept=".csv,.json,.tsv,.xlsx,.txt" 
                    className="hidden" 
                    onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                  />
                </div>

                <div className="text-center pt-2">
                  <button 
                    onClick={downloadTemplate}
                    className="text-slate-500 hover:text-brand-600 text-sm font-bold underline transition-colors"
                  >
                    Download Analysis Template CSV
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && previewData && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Auto-standardization success */}
                <div className="p-5 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-700 font-extrabold text-lg mb-1 tracking-tight">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    Auto-Standardized Successfully
                  </div>
                  <p className="text-sm font-medium text-emerald-600 ml-9">
                    {previewData.total_rows?.toLocaleString()} transactions detected and converted to standard format.
                  </p>
                </div>

                {/* Column Mapping Summary */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white/60 backdrop-blur-sm">
                  <div className="bg-slate-50/80 border-b border-slate-200/60 px-5 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Column Mapping
                  </div>
                  <div className="p-5 space-y-3">
                    {Object.entries(resolvedFields).map(([canonical, source]) => (
                      <div key={canonical} className="flex items-center justify-between text-sm bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-600 font-medium">{source}</span>
                        <span className="text-slate-300 mx-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          {canonical}
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                        </span>
                      </div>
                    ))}
                    {Object.entries(appliedDefaults).map(([canonical, val]) => (
                      <div key={canonical} className="flex items-center justify-between text-sm bg-amber-50/30 p-2 rounded-lg border border-amber-100/50">
                        <span className="text-slate-400 font-medium italic">default: {String(val)}</span>
                        <span className="text-slate-300 mx-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </span>
                        <span className="font-bold text-amber-700 flex items-center gap-2">
                          {canonical}
                          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unmapped columns info */}
                {unmappedCols.length > 0 && (
                  <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-200/60 flex gap-3">
                    <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Unmapped Input Columns (ignored)</p>
                      <p className="text-sm font-medium text-slate-500">{unmappedCols.join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* Data Preview */}
                {previewData.preview && previewData.preview.length > 0 && (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white/60 backdrop-blur-sm">
                    <div className="bg-slate-50/80 border-b border-slate-200/60 px-5 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      Standardized Preview
                    </div>
                    <div className="overflow-x-auto max-h-48 custom-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 shadow-sm z-10">
                          <tr>
                            {previewData.standardized_columns?.map(col => (
                              <th key={col} className="px-4 py-2.5 text-left font-bold tracking-wide whitespace-nowrap bg-slate-50/90 backdrop-blur-md">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.preview.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              {previewData.standardized_columns?.map(col => (
                                <td key={col} className="px-4 py-2 text-slate-600 font-medium whitespace-nowrap">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stats bar */}
                <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-inner">
                  <div className="text-sm text-slate-500 font-medium flex flex-col items-center">
                    <span className="text-xl font-extrabold text-slate-800 tracking-tight">{previewData.total_rows?.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-widest mt-0.5">rows</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-sm text-slate-500 font-medium flex flex-col items-center">
                    <span className="text-xl font-extrabold text-slate-800 tracking-tight">{previewData.columns?.length}</span>
                    <span className="text-[10px] uppercase tracking-widest mt-0.5">input columns</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-sm text-emerald-600 font-medium flex flex-col items-center">
                    <span className="text-xl font-extrabold tracking-tight">{Object.keys(resolvedFields).length}</span>
                    <span className="text-[10px] uppercase tracking-widest mt-0.5">mapped</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16 flex flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative w-20 h-20 mb-2">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 bg-brand-50 rounded-full flex items-center justify-center">
                       <svg className="w-6 h-6 text-brand-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Preparing Analysis</h3>
                  <div className="space-y-2 bg-slate-50/80 px-6 py-4 rounded-2xl border border-slate-100">
                    <span className="block text-sm font-bold text-slate-700 flex items-center justify-center gap-3">
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                      File parsed & standardized
                    </span>
                    <span className="block text-sm font-bold text-slate-700 flex items-center justify-center gap-3 animate-pulse">
                      <span className="inline-flex w-5 h-5 rounded-full bg-brand-100 text-brand-600 items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                      </span>
                      Loading into analysis engine...
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-6 bg-slate-100/80 px-4 py-2 rounded-full inline-block">
                    Please wait — not modifying your database
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200/60 flex justify-end gap-3 bg-white/60 backdrop-blur-md rounded-b-3xl">
            {step === 1 && (
              <button 
                onClick={onClose} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:shadow-sm rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            )}
            {step === 2 && (
              <>
                <button 
                  onClick={() => setStep(1)} 
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:shadow-sm rounded-xl transition-all duration-200"
                  disabled={uploading}
                >
                  Back
                </button>
                <button 
                  onClick={handleStartAnalysis}
                  className="px-6 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all duration-300 shadow-md shadow-brand-500/20 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={uploading || !allResolved}
                >
                  {previewData?.ml_available !== false ? '🚀 Start Analysis + ML' : 'Start Analysis'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
