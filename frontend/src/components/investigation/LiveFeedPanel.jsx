import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

const LiveFeedPanel = ({ isRunning, events, onStop }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  if (!isRunning && events.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 w-96 max-w-[90vw] z-[60] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-amber-500/30"
    >
      <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <h3 className="font-bold text-sm tracking-wide">Live Attack Simulation</h3>
        </div>
        {isRunning && (
          <button 
            onClick={onStop}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded transition-colors"
          >
            STOP
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className="bg-white/95 backdrop-blur-xl p-2 max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-2"
      >
        <AnimatePresence>
          {events.map((evt, idx) => (
            <motion.div 
              key={evt.txn_id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-xl border text-xs flex flex-col gap-1 shadow-sm ${evt.is_suspicious ? 'bg-red-50/50 border-red-200/60' : 'bg-slate-50/50 border-slate-200/60'}`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span>{evt.timestamp.split('T')[1]} • {evt.channel}</span>
                <span className="text-slate-700">{evt.txn_id}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-brand-700">{evt.from_account?.slice(-6) || 'Unknown'}</span>
                <svg className="w-4 h-4 text-slate-300 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                <span className="text-emerald-700">{evt.to_account?.slice(-6) || 'Unknown'}</span>
                <span className="font-bold text-slate-800 ml-auto">{formatCurrency(evt.amount)}</span>
              </div>
              {evt.detection_fired && (
                <div className="mt-1 flex">
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-red-200">
                    Flag: {evt.detection_fired.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
          {events.length === 0 && isRunning && (
            <div className="p-4 text-center text-xs text-amber-600 font-medium animate-pulse">
              Waiting for network events...
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LiveFeedPanel;
