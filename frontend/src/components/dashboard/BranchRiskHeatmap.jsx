import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const BranchRiskHeatmap = ({ alerts }) => {
  const data = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];

    const bankRisks = {};
    alerts.forEach(a => {
      const bank = a.bank || 'Unknown';
      const score = Math.max(a.risk_score || 0, a.ml_risk_score || 0);
      bankRisks[bank] = (bankRisks[bank] || 0) + score;
    });

    const arr = Object.keys(bankRisks).map(bank => ({
      name: bank,
      risk: bankRisks[bank]
    }));

    // Sort by descending risk
    arr.sort((a, b) => b.risk - a.risk);
    
    // Take top 10
    return arr.slice(0, 10);
  }, [alerts]);

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-sm flex flex-col justify-center items-center h-[300px] w-full mt-6"
      >
        <p className="text-slate-400">Run detection to view branch risk exposure</p>
      </motion.div>
    );
  }

  // Calculate max to color scale
  const maxRisk = Math.max(...data.map(d => d.risk), 1);

  const getColor = (risk) => {
    const ratio = risk / maxRisk;
    if (ratio > 0.8) return '#ef4444'; // red-500
    if (ratio > 0.5) return '#f97316'; // orange-500
    if (ratio > 0.3) return '#f59e0b'; // amber-500
    return '#3b82f6'; // blue-500
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex flex-col h-[380px] w-full mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Branch/Bank Risk Exposure</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Top institutions by cumulative risk score</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              width={100}
            />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              formatter={(value) => [value, 'Total Risk']}
            />
            <Bar dataKey="risk" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.risk)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default BranchRiskHeatmap;
