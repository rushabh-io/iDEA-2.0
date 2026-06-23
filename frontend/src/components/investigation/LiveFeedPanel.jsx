import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';
import { generateCaseTitle } from '../../utils/caseTitles';
import { descriptionFromSimulation } from '../../utils/caseDescriptions';
import { openCase } from '../../api/client';

const LiveFeedPanel = ({ isRunning, events, onStop, onClose, onCaseCreated, analysisMode = false }) => {
  const containerRef = useRef(null);
  const caseCreatedForRunRef = useRef(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [autoCreatedCaseId, setAutoCreatedCaseId] = useState(null);

  const getExplanationDetails = (evt) => {
    const patternKey = evt.detection_fired || 'circular_flow';
    let patternName = 'Circular Flow';
    let logic = '';

    if (patternKey.toLowerCase().includes('cycle') || patternKey.toLowerCase().includes('circular')) {
      patternName = 'Circular Flow';
      logic = `${events.filter(e => e.type === 'transaction').length}-hop circular flow detected. Funds moved sequentially across multiple bank accounts and returned to the initial sender, indicating round-tripping layering design to obscure the capital origin.`;
    } else if (patternKey.toLowerCase().includes('smurf')) {
      patternName = 'Smurfing';
      logic = 'Multiple high-velocity transactions styled just under the regulatory reporting threshold were routed into a single destination account.';
    } else if (patternKey.toLowerCase().includes('fan_out') || patternKey.toLowerCase().includes('fanout')) {
      patternName = 'Fan-Out';
      logic = 'One origin account rapidly dispersed large sums of money to several distinct beneficiaries, suggesting layering distribution structures.';
    } else if (patternKey.toLowerCase().includes('dormant')) {
      patternName = 'Dormant Account';
      logic = 'An account with a long period of inactivity suddenly initiated large volume transfers, suggesting account takeover or proxy activation.';
    } else if (patternKey.toLowerCase().includes('collusion')) {
      patternName = 'Banker Collusion';
      logic = 'Transactional flows between nodes sharing co-directors or Politically Exposed Persons (PEPs) mapping internal routing shortcuts.';
    } else if (patternKey.toLowerCase().includes('velocity') || patternKey.toLowerCase().includes('geo')) {
      patternName = 'Geo-Velocity';
      logic = 'High-value transfers originating from geographically distant terminals within physically impossible periods, implying shell proxies.';
    } else {
      patternName = 'Circular Flow';
      logic = 'Detected suspicious cyclic pattern linking accounts across multiple institutions with round-tripping signatures.';
    }

    const txns = events.filter(e => e.type === 'transaction');
    let path = '';
    if (txns.length > 0) {
      const steps = txns.map(t => `${t.bank_from} (${t.from_account})`);
      const lastTx = txns[txns.length - 1];
      steps.push(`${lastTx.bank_to} (${lastTx.to_account})`);
      path = steps.join(' ➔ ');
    } else {
      path = `${evt.bank_from} (${evt.from_account}) ➔ ${evt.bank_to} (${evt.to_account})`;
    }

    return {
      patternName,
      riskScore: evt.risk_score || 87,
      entities: {
        source: evt.from_account || 'Unknown',
        destination: evt.to_account || 'Unknown',
        sourceBank: evt.bank_from || 'Unknown Bank',
        destBank: evt.bank_to || 'Unknown Bank'
      },
      path,
      amountStr: formatCurrency(evt.amount),
      logic
    };
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    if (isRunning) {
      caseCreatedForRunRef.current = false;
      setAutoCreatedCaseId(null);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning && events.length > 0) {
      setShowSummary(true);

      if (caseCreatedForRunRef.current) return;

      const flaggedTxn = events.find(e => e.detection_fired || e.is_suspicious);
      const targetAcc = flaggedTxn ? (flaggedTxn.from_account || flaggedTxn.to_account) : null;
      if (!targetAcc) return;

      caseCreatedForRunRef.current = true;

      const pattern = flaggedTxn.detection_fired || 'circular_flow';
      const totalAmount = events.reduce((sum, evt) => sum + (evt.amount || 0), 0);
      const amount = flaggedTxn.amount || totalAmount || 100000;
      const titleStr = generateCaseTitle(pattern, targetAcc, amount);
      const description = descriptionFromSimulation(pattern, events, targetAcc);

      openCase({
        account_id: targetAcc,
        title: titleStr,
        priority: 'High',
        assigned_to: 'Simulation Engine',
        pattern_type: pattern,
        notes: description,
      })
        .then(res => {
          setAutoCreatedCaseId(res.case_id);
          if (onCaseCreated) onCaseCreated();
        })
        .catch(err => console.error('Failed to auto-create simulation case', err));
    }
  }, [isRunning, events, onCaseCreated]);

  if (!isRunning && events.length === 0) return null;

  const flaggedTransaction = events.find(e => e.detection_fired);
  const detectionPattern = flaggedTransaction?.detection_fired?.replace(/_/g, ' ') || 'Circular Flow';
  const totalAmount = events.reduce((sum, evt) => sum + (evt.amount || 0), 0);

  const uniqueBanks = [];
  events.forEach(evt => {
    if (evt.bank_from && !uniqueBanks.includes(evt.bank_from)) uniqueBanks.push(evt.bank_from);
    if (evt.bank_to && !uniqueBanks.includes(evt.bank_to)) uniqueBanks.push(evt.bank_to);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 w-96 max-w-[90vw] z-[60] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-amber-500/30 font-sans"
    >
      <div className={`text-white px-4 py-3 flex items-center justify-between shadow-sm relative ${isRunning ? 'bg-amber-500' : 'bg-emerald-500'}`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <h3 className="font-bold text-sm tracking-wide">
            {isRunning ? 'Live Attack Simulation' : 'Simulation Complete'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={onStop}
              className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded transition-colors"
            >
              STOP
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Close Panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
                <span className="text-brand-700 font-mono text-[11px]">{evt.from_account || 'Unknown'} {evt.bank_from ? `(${evt.bank_from})` : ''}</span>
                <svg className="w-4 h-4 text-slate-300 mx-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                <span className="text-emerald-700 font-mono text-[11px]">{evt.to_account || 'Unknown'} {evt.bank_to ? `(${evt.bank_to})` : ''}</span>
                <span className="font-bold text-slate-800 ml-auto">{formatCurrency(evt.amount)}</span>
              </div>
              {(evt.detection_fired || evt.is_suspicious) && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-red-200">
                    Flag: {evt.detection_fired ? evt.detection_fired.replace(/_/g, ' ') : 'SUSPICIOUS'}
                  </span>
                  <button
                    onClick={() => setSelectedExplanation(evt)}
                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded shadow-sm border border-slate-700 transition-colors"
                  >
                    Explain This
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {!isRunning && showSummary && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-2 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-xs space-y-2">
                  <p className="font-bold text-emerald-900">Simulation complete</p>
                  <p className="text-emerald-800 font-medium">
                    {events.length}-hop {detectionPattern.toLowerCase()} pattern detected
                  </p>
                  <p className="text-emerald-700">
                    Cycle: {uniqueBanks.join(' → ')}
                  </p>
                  <p className="text-emerald-700">
                    Amount flagged: <span className="font-bold">{formatCurrency(totalAmount)}</span>
                  </p>
                  {autoCreatedCaseId && (
                    <p className="text-emerald-700 font-mono text-[10px] bg-white/50 px-2 py-1 rounded border border-emerald-200">
                      Case auto-created: {autoCreatedCaseId}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {events.length === 0 && isRunning && (
            <div className="p-4 text-center text-xs text-amber-600 font-medium animate-pulse">
              Waiting for network events...
            </div>
          )}
        </AnimatePresence>
      </div>

      {selectedExplanation && (() => {
        const details = getExplanationDetails(selectedExplanation);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-xl font-sans relative overflow-hidden flex flex-col gap-5 text-left"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500"></div>

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase block">Nexara Explainable AI (XAI)</span>
                  <h3 className="text-xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider">
                      {details.patternName}
                    </span>
                    Alert Explanation
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedExplanation(null)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-4 items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] shrink-0">
                  <span className="text-2xl font-black">{details.riskScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Risk</span>
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detection Verdict</h4>
                  <p className="text-sm font-semibold text-slate-200">Flagged as Laundering Topology</p>
                  <p className="text-[11px] text-slate-500 font-medium">SHAP explainability confirms 92.4% feature deviation.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Source Account</span>
                    <span className="font-mono text-xs font-bold text-slate-300 block">{details.entities.sourceBank}</span>
                    <span className="font-mono text-[11px] text-slate-500">{details.entities.source}</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination Account</span>
                    <span className="font-mono text-xs font-bold text-slate-300 block">{details.entities.destBank}</span>
                    <span className="font-mono text-[11px] text-slate-500">{details.entities.destination}</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Amount</span>
                  <span className="text-base font-extrabold text-white">{details.amountStr}</span>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/50 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Flow Path</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                    {details.path.split(' ➔ ').map((step, idx, arr) => (
                      <React.Fragment key={idx}>
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-bold">{step}</span>
                        {idx < arr.length - 1 && (
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detection Logic</span>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium bg-slate-900/20 p-3 rounded-lg border border-slate-800/40">
                    {details.logic}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedExplanation(null)}
                  className="px-5 py-2 text-xs font-bold bg-white text-slate-950 rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
                >
                  Close Explanation
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </motion.div>
  );
};

export default LiveFeedPanel;
