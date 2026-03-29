import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getRiskLabel } from '../../utils/riskColors';

const RiskDistribution = ({ alerts }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!alerts || alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-sm flex flex-col justify-center items-center h-[340px]"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100/80 to-slate-200/80 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-500">Run detection to view risk tiers</h3>
        <p className="text-xs text-slate-400 mt-2">Risk distribution will appear here</p>
      </motion.div>
    );
  }

  // Aggregate into categories based on max of (risk_score, ml_risk_score)
  const distribution = {
    'Critical': 0,
    'High': 0,
    'Medium': 0,
    'Low': 0
  };

  alerts.forEach(a => {
    const rawScore = Math.max(a.risk_score || 0, a.ml_risk_score || 0);
    const label = getRiskLabel(rawScore);
    distribution[label]++;
  });

  const data = Object.keys(distribution)
    .map(key => ({ name: key, value: distribution[key] }))
    .filter(item => item.value > 0);

  const GRADIENTS = {
    'Critical': ['#ef4444', '#dc2626'],
    'High': ['#f97316', '#ea580c'],
    'Medium': ['#f59e0b', '#d97706'],
    'Low': ['#10b981', '#059669'] // emerald
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / alerts.length) * 100).toFixed(1);
      return (
        <div className="bg-white/95 backdrop-blur-md border border-white/60 rounded-xl shadow-lg shadow-black/5 p-3 animate-scale-in">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ background: `linear-gradient(to bottom, ${GRADIENTS[data.name][0]}, ${GRADIENTS[data.name][1]})` }}
            />
            <span className="text-sm font-bold text-slate-800">{data.name}</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Count: <span className="font-bold text-slate-700">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Percentage: <span className="font-bold text-slate-700">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex flex-col h-[340px]"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Portfolio Risk Tiering</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Risk distribution across alerts</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`pie-grad-${index}`} id={`pie-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GRADIENTS[entry.name][0]} />
                  <stop offset="100%" stopColor={GRADIENTS[entry.name][1]} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={67}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={1500}
              animationBegin={400}
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pie-grad-${index})`}
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '16px'
              }}
              formatter={(value) => (
                <span className="text-slate-600 font-semibold mx-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Risk summary */}
      <div className="mt-2 pt-4 border-t border-slate-200/50">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Total Alerts:</span>
          <span className="font-extrabold text-slate-700">{alerts.length.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default RiskDistribution;
