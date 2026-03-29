import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const AccuracyCard = ({ metrics, isAnalysis = false }) => {
  const [animatedMetrics, setAnimatedMetrics] = useState({});

  useEffect(() => {
    if (metrics) {
      // Animate metrics counting up
      const duration = 1000;
      const steps = 30;
      const interval = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setAnimatedMetrics({
          precision: Math.round((metrics.precision_pct || 0) * easeOut),
          recall: Math.round((metrics.recall_pct || 0) * easeOut),
          f1: Math.round((metrics.f1_score || 0) * easeOut),
          accuracy: Math.round((metrics.accuracy_pct || 0) * easeOut),
        });

        if (step >= steps) {
          clearInterval(timer);
          setAnimatedMetrics({
            precision: metrics.precision_pct || 0,
            recall: metrics.recall_pct || 0,
            f1: metrics.f1_score || 0,
            accuracy: metrics.accuracy_pct || 0,
          });
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [metrics]);

  if (!metrics) {
    if (isAnalysis) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-8 shadow-sm col-span-2 text-center flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-slate-100/80 to-slate-200/80 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">CSV Analysis Performance</h2>
          <p className="text-sm font-medium text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Run detection to see metrics. If your CSV contains an <code className="bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded text-slate-700 font-mono text-xs shadow-sm">is_fraud</code> column, precision and recall will be calculated automatically.
          </p>
        </motion.div>
      );
    }
    return null;
  }

  const title = isAnalysis ? "CSV Analysis Performance" : "IBM Dataset Validation";
  const subtext = isAnalysis ? "Performance against CSV ground truth labels" : "Ground truth performance on NeurIPS 2023 AML Dataset";

  const metricItems = [
    {
      label: "Precision",
      value: animatedMetrics.precision || 0,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-100/50",
      textColor: "text-blue-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: "Recall",
      value: animatedMetrics.recall || 0,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-100/50",
      textColor: "text-purple-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      label: "F1 Score",
      value: animatedMetrics.f1 || 0,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-100/50",
      textColor: "text-emerald-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: "Accuracy",
      value: animatedMetrics.accuracy || 0,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-100/50",
      textColor: "text-amber-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 col-span-2"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">{subtext}</p>
        </div>
        <span className="px-4 py-1.5 bg-gradient-to-r from-slate-100/80 to-slate-200/80 text-slate-700 text-xs font-bold rounded-full border border-slate-200/60 shadow-sm backdrop-blur-sm">
          {isAnalysis ? 'IN-MEMORY' : 'NEURIPS 2023'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricItems.map((item, index) => (
          <div
            key={item.label}
            className="group relative bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${item.bgColor} ${item.textColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-slate-600">{item.label}</span>
            </div>

            <div className="relative">
              <span className={`text-4xl font-extrabold bg-gradient-to-r ${item.color} bg-clip-text text-transparent tracking-tight`}>
                {item.value}%
              </span>

              {/* Progress bar */}
              <div className="mt-4 h-2 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confusion Matrix */}
      <div className="bg-gradient-to-br from-slate-50/80 to-slate-100/50 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Confusion Matrix
        </h3>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {/* Header row */}
          <div className="font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center">Predicted \ True</div>
          <div className="font-bold text-slate-700 text-center bg-white/80 rounded-xl py-2.5 border border-slate-200/60 shadow-sm backdrop-blur-sm">Laundering</div>
          <div className="font-bold text-slate-700 text-center bg-white/80 rounded-xl py-2.5 border border-slate-200/60 shadow-sm backdrop-blur-sm">Clean</div>

          {/* Suspicious row */}
          <div className="font-bold text-slate-700 flex items-center bg-white/80 rounded-xl px-4 py-3 border border-slate-200/60 shadow-sm backdrop-blur-sm">Suspicious</div>
          <div className="bg-gradient-to-br from-red-50 to-red-100/80 text-red-800 font-bold py-4 rounded-xl border border-red-200/60 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl">{metrics.confusion_matrix.tp.toLocaleString()}</div>
            <div className="text-xs font-semibold text-red-600/80 mt-1 uppercase tracking-wider">True Pos</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-800 font-bold py-4 rounded-xl border border-amber-200/60 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl">{metrics.confusion_matrix.fp.toLocaleString()}</div>
            <div className="text-xs font-semibold text-amber-600/80 mt-1 uppercase tracking-wider">False Pos</div>
          </div>

          {/* Benign row */}
          <div className="font-bold text-slate-700 flex items-center bg-white/80 rounded-xl px-4 py-3 border border-slate-200/60 shadow-sm backdrop-blur-sm">Benign</div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-800 font-bold py-4 rounded-xl border border-orange-200/60 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl">{metrics.confusion_matrix.fn.toLocaleString()}</div>
            <div className="text-xs font-semibold text-orange-600/80 mt-1 uppercase tracking-wider">False Neg</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-800 font-bold py-4 rounded-xl border border-emerald-200/60 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl">{metrics.confusion_matrix.tn.toLocaleString()}</div>
            <div className="text-xs font-semibold text-emerald-600/80 mt-1 uppercase tracking-wider">True Neg</div>
          </div>
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-5 border-t border-slate-200/50 text-sm font-medium text-slate-500 text-center">
        Identified <span className="font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded border border-slate-200 shadow-sm shadow-slate-200/50 mx-1">{metrics.confusion_matrix.tp.toLocaleString()}</span> laundering transactions
        out of <span className="font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded border border-slate-200 shadow-sm shadow-slate-200/50 mx-1">{metrics.total_laundering_in_dataset.toLocaleString()}</span> planted in the dataset.
      </div>
    </motion.div>
  );
};

export default AccuracyCard;
