import React from 'react';
import { motion } from 'framer-motion';

const RiskMeter = ({ score = 0, mlScore = 0 }) => {
  // Combine or use highest
  const displayScore = Math.max(score, mlScore);
  
  // Determine color and status
  let color = "text-emerald-500";
  let bgFill = "bg-emerald-500";
  let status = "Low Risk";
  
  if (displayScore >= 75) {
    color = "text-red-600";
    bgFill = "bg-red-600";
    status = "Critical Risk";
  } else if (displayScore >= 40) {
    color = "text-amber-500";
    bgFill = "bg-amber-500";
    status = "Elevated Risk";
  }

  // Calculate rotation for the gauge needle (-90deg to 90deg)
  const rotation = -90 + (displayScore / 100) * 180;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white p-5 mt-6"
    >
      <div className="text-center mb-6">
        <h3 className="font-bold text-slate-800 tracking-tight">Composite Risk Score</h3>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">Algorithmic & AI Model Synthesis</p>
      </div>

      <div className="relative w-48 h-24 mx-auto overflow-hidden">
        {/* Semi-circle background */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-slate-100"></div>
        
        {/* Fill arc (simplified via conic-gradient or SVG for exactness, using a trick here) */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.5rem] border-transparent border-t-slate-200 border-l-slate-200 border-r-transparent border-b-transparent transform -rotate-45 opacity-20"></div>

        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-20 bg-slate-800 origin-bottom transform transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10 rounded-t-full shadow-md"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-slate-800 rounded-full border-4 border-white shadow-sm hover:scale-110 transition-transform"></div>
        </div>
      </div>

      <div className="text-center mt-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`text-4xl font-extrabold tracking-tighter ${color}`}
        >
          {Math.round(displayScore)}
        </motion.div>
        <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${color}`}>
          {status}
        </div>
      </div>
    </motion.div>
  );
};

export default RiskMeter;
