import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const PatternBreakdown = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-sm flex flex-col justify-center items-center h-[340px]"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100/80 to-slate-200/80 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-500">Run detection to see patterns</h3>
        <p className="text-xs text-slate-400 mt-2">Pattern analysis will appear here</p>
      </motion.div>
    );
  }

  // Count alerts by type (flags ending in '_flag' + specific pattern typologies)
  const patternCounts = {
    'Circular Flow': 0,
    'Fan-Out': 0,
    'Fan-In': 0,
    'Gather-Scatter': 0,
    'Bipartite/Stack': 0,
    'Smurfing': 0,
    'Velocity': 0,
    'Anomaly': 0,
    'Layering': 0,
    'Co-Director': 0,
    'PEP': 0
  };

  alerts.forEach(a => {
    if (a.flag === 'CIRCULAR_FLOW') patternCounts['Circular Flow']++;
    if (a.fan_out_flag) patternCounts['Fan-Out']++;
    if (a.fan_in_flag) patternCounts['Fan-In']++;
    if (a.gather_scatter_flag || a.scatter_gather_flag) patternCounts['Gather-Scatter']++;
    if (a.flag === 'BIPARTITE' || a.flag === 'STACK') patternCounts['Bipartite/Stack']++;
    if (a.flag === 'SMURFING') patternCounts['Smurfing']++;
    if (a.velocity_flag) patternCounts['Velocity']++;
    if (a.flag === 'ANOMALY') patternCounts['Anomaly']++;
    if (a.layering_score > 0) patternCounts['Layering']++;
    if (a.codirector_flag) patternCounts['Co-Director']++;
    if (a.pep_connected) patternCounts['PEP']++;
  });

  const data = Object.keys(patternCounts)
    .map(key => ({ name: key, count: patternCounts[key] }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count); // sort descending

  const getGradient = (name) => {
    const map = {
      'Circular Flow': ['#dc2626', '#ef4444'],
      'Fan-Out': ['#f59e0b', '#fbbf24'],
      'Fan-In': ['#f59e0b', '#fbbf24'],
      'Smurfing': ['#d97706', '#f59e0b'],
      'Velocity': ['#9333ea', '#a855f7'],
      'Gather-Scatter': ['#0ea5e9', '#38bdf8'],
      'Bipartite/Stack': ['#2563eb', '#3b82f6'],
      'Layering': ['#0d9488', '#14b8a6'],
      'PEP': ['#db2777', '#ec4899'],
      'Co-Director': ['#4f46e5', '#6366f1'],
      'Anomaly': ['#64748b', '#94a3b8'],
    };
    return map[name] || ['#94a3b8', '#cbd5e1'];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-white/60 rounded-xl shadow-lg shadow-black/5 p-3 animate-scale-in">
          <p className="text-sm font-bold text-slate-800 mb-1">{label}</p>
          <p className="text-xs text-slate-500 font-medium">
            Count: <span className="font-bold text-brand-600">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex flex-col h-[340px]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Detected Patterns</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Suspicious activity patterns identified</p>
        </div>
        <div className="flex items-center gap-2 bg-brand-50/50 px-3 py-1.5 rounded-full border border-brand-100/50">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
          <span className="text-xs font-semibold text-brand-700">Live</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={getGradient(entry.name)[0]} />
                  <stop offset="100%" stopColor={getGradient(entry.name)[1]} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.5} />
            <XAxis
              type="number"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.5 }} />
            <Bar
              dataKey="count"
              radius={[0, 8, 8, 0]}
              barSize={20}
              animationDuration={1500}
              animationBegin={200}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#grad-${index})`}
                  className="hover:opacity-80 transition-opacity duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Total patterns: <span className="font-bold text-slate-700 ml-1">{data.length}</span>
        </span>
        <span className="text-xs font-medium text-slate-500">
          Total alerts: <span className="font-bold text-slate-700 ml-1">{alerts.length.toLocaleString()}</span>
        </span>
      </div>
    </motion.div>
  );
};

export default PatternBreakdown;
