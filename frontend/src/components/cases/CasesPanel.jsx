import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCases, updateCase } from '../../api/client';
import CaseCard from './CaseCard';
import CaseForm from './CaseForm';

const CasesPanel = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await getCases();
      setCases(data || []);
    } catch (e) {
      console.error("Failed to fetch cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleUpdate = async (caseId, updates) => {
    try {
      await updateCase(caseId, updates);
      fetchCases();
      setSelectedCase(null);
    } catch (e) {
      console.error("Failed to update case");
    }
  };

  return (
    <div className="flex-1 w-full flex bg-slate-50 h-full overflow-hidden">
      {/* Case List */}
      <div className="w-full max-w-2xl mx-auto p-8 overflow-y-auto custom-scrollbar relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-end mb-8 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Active Investigations</h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">Manage and update active alerts and cases securely.</p>
          </div>
          <button 
            onClick={fetchCases} 
            className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl hover:bg-white hover:text-brand-600 hover:shadow-md transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="relative w-12 h-12">
               <div className="absolute inset-0 rounded-full border-4 border-slate-200/60"></div>
               <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : cases.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-slate-200/60">
              <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">No active cases</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-[250px] mx-auto">Get started by analyzing the network graph and creating a case from an entity.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {cases.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <CaseCard 
                    caseItem={c}
                    onClick={() => setSelectedCase(c)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Slide-over Panel for Case Details/Form */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 z-30 ${selectedCase ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedCase && (
          <div className="h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Manage Case</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5 leading-tight">{selectedCase.id}</h2>
              </div>
              <button 
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mb-6 pb-6 border-b border-slate-100">
                <h3 className="text-sm font-medium text-slate-500 mb-1">Title</h3>
                <p className="text-slate-900 font-medium">{selectedCase.title}</p>
                
                <h3 className="text-sm font-medium text-slate-500 mb-1 mt-4">Related Account</h3>
                <p className="text-slate-900 font-mono text-sm">{selectedCase.account_id}</p>
              </div>

              <h3 className="text-sm font-bold tracking-wider text-slate-800 uppercase mb-4">Update Case</h3>
              
              <CaseForm 
                caseItem={selectedCase}
                onSave={handleUpdate}
                onCancel={() => setSelectedCase(null)}
              />
              
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay */}
      {selectedCase && (
        <div 
          className="fixed inset-0 bg-slate-900/10 z-20 transition-opacity"
          onClick={() => setSelectedCase(null)}
        ></div>
      )}
    </div>
  );
};

export default CasesPanel;
