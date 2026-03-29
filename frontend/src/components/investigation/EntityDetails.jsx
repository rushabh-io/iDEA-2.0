import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatId } from '../../utils/formatters';
import { getOwnership, getUBO, getAnalysisOwnership } from '../../api/client';
import { getRiskPillClass, getRiskLabel } from '../../utils/riskColors';
import NodeDetail from './NodeDetail';
import RiskMeter from './RiskMeter';
import AlertPanel from './AlertPanel';
import OwnershipChain from './OwnershipChain';
import ShapExplanation from './ShapExplanation';

const EntityDetails = ({ entity, onReportClick, onCreateCase, isAnalysis = false }) => {
  const [ownershipData, setOwnershipData] = useState(null);
  const [ubo, setUbo] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (entity?.type === 'Account') {
      setLoadingConfig(true);
      const ownFn = isAnalysis ? getAnalysisOwnership : getOwnership;
      const uboFn = isAnalysis ? () => Promise.resolve({ data: { ubo: null } }) : getUBO;

      Promise.all([
        ownFn(entity.id),
        uboFn(entity.id)
      ])
      .then(([ownRes, uboRes]) => {
        setOwnershipData(ownRes?.data?.chains || ownRes?.chains || []);
        setUbo(uboRes?.data?.ubo || uboRes?.ubo || null);
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));
    }
  }, [entity, isAnalysis]);

  if (!entity) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100/50 to-slate-200/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200/50">
          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500 max-w-[200px]">Select an entity in the graph to view details and investigation context.</p>
      </motion.div>
    );
  }

  const isPerson = entity.type === 'Person';
  const score = Math.max(entity.risk_score || 0, entity.ml_risk_score || 0);
  
  // Extract typography flags
  const flags = Object.keys(entity)
    .filter(k => k.endsWith('_flag') && entity[k] === true)
    .map(k => k.replace('_flag', '').replace(/_/g, ' ').toUpperCase());
    
  if (entity.suspicious && flags.length === 0) {
    flags.push('RULE-BASED ANOMALY');
  }

  return (
    <motion.div 
      key={entity.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col h-full space-y-6 pb-10"
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${
              isPerson 
                ? 'bg-amber-100/80 text-amber-800 border border-amber-200/60' 
                : 'bg-brand-100/80 text-brand-800 border border-brand-200/60'
            }`}>
              {entity.type}
            </span>
            {!isPerson && (
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest shadow-sm border ${getRiskPillClass(score)}`}>
                {score} RISK ({getRiskLabel(score)})
              </span>
            )}
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight break-all">
          {isPerson ? entity.name : entity.bank || 'Unknown Bank'}
        </h2>
        <p className="text-sm text-slate-500 font-medium font-mono mt-1 opacity-80">{entity.id}</p>
      </div>

      <div className="h-px w-full bg-slate-200/60"></div>

      {/* Flags & ML section */}
      {!isPerson && (
        <div className="space-y-5">
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Detected Typologies</h3>
            {flags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {flags.map(f => (
                  <span key={f} className="px-2.5 py-1 bg-red-50/80 border border-red-200/60 text-red-700 text-xs font-bold rounded-lg shadow-sm">
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-500 font-medium italic">No typologies detected</span>
            )}
          </div>
          
          {entity.ml_prediction && (
            <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-xs font-bold text-slate-700 tracking-wide uppercase">ML Model Prediction</h4>
                <span className={`text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded shadow-sm ${entity.ml_prediction === 'LAUNDERING' ? 'bg-red-100/80 text-red-700 border border-red-200/60' : 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60'}`}>
                  {entity.ml_prediction}
                </span>
              </div>
              <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${entity.ml_risk_score || 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${entity.ml_prediction === 'LAUNDERING' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>0% RISK</span>
                <span>{Math.round(entity.ml_risk_score || 0)}% LIMIT</span>
              </div>
            </div>
          )}
          
          <ShapExplanation accountId={entity.id} />
        </div>
      )}
      
      {/* Risk Meter */}
      {!isPerson && (
        <RiskMeter score={entity.risk_score} mlScore={entity.ml_risk_score} />
      )}
      
      {/* Node Details */}
      <div className="mt-2">
        <NodeDetail entity={entity} />
      </div>

      {isPerson && (
        <div className="space-y-1.5 mt-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
          <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
            <span className="text-sm font-medium text-slate-500">Nationality</span>
            <span className="text-sm font-bold text-slate-900">{entity.nationality || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-slate-500">PEP Status</span>
            {entity.pep ? (
               <span className="text-xs font-extrabold tracking-widest uppercase text-pink-700 bg-pink-100/80 px-2 py-1 rounded shadow-sm border border-pink-200/60">Politically Exposed</span>
            ) : (
               <span className="text-sm font-bold text-slate-900">None</span>
            )}
          </div>
        </div>
      )}

      {/* Alerts Panel */}
      {!isPerson && (
        <AlertPanel 
          alerts={[
            ...(flags.map((f) => ({ pattern: f, date: "System", severity: "High", description: `Triggered by ${f} rule logic.` }))),
            ...(entity.ml_prediction === "LAUNDERING" ? [{ pattern: "ML AI Trigger", date: "System", severity: "Critical", description: "Node scored high in Random Forest evaluation." }] : [])
          ]} 
          onReview={() => onCreateCase(entity)}
        />
      )}

      {/* Ownership structure info */}
      {!isPerson && (
        <OwnershipChain accountId={entity.id} />
      )}

      <div className="flex-1"></div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-6 border-t border-slate-200/60 mt-auto">
        <button 
          onClick={() => onReportClick(entity)}
          className="w-full flex justify-center items-center py-2.5 px-4 bg-white/80 border border-slate-300/80 rounded-xl shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <svg className="w-4 h-4 mr-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate Profile Report
        </button>
        <button 
          onClick={() => onCreateCase(entity)}
          className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <svg className="w-4 h-4 mr-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Open Investigation Case
        </button>
      </div>
    </motion.div>
  );
};

export default EntityDetails;
