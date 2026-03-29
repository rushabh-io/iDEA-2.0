import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TimeLapse = ({ onTimeChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let interval;
    if (isPlaying && progress < 100) {
      interval = setInterval(() => {
        setProgress(p => {
          const next = Number(p) + 1;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }, 100); // Speed of simulation
    } else if (isPlaying && progress >= 100) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress]);

  // Notify parent AFTER render via a separate effect
  useEffect(() => {
    if (onTimeChange) onTimeChange(progress);
  }, [progress, onTimeChange]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white px-6 py-4 flex flex-col items-center z-20 w-[500px]"
    >
      <div className="flex justify-between items-center w-full mb-3">
         <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Historical Transaction Simulation
         </h3>
         <button 
           onClick={togglePlay}
           className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all shadow-sm border flex items-center gap-2 ${isPlaying ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100'}`}
         >
           {isPlaying ? (
             <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-[pulse_1s_infinite]"></div>
                PAUSE SIMULATION
             </>
           ) : (
             <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                SIMULATE FLOW
             </>
           )}
         </button>
      </div>

      <div className="w-full relative group">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress} 
          onChange={(e) => {
            const val = Number(e.target.value);
            setProgress(val);
            if(onTimeChange) onTimeChange(val);
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all z-10 hover:bg-slate-300/80 bg-slate-200/80"
          style={{
             background: `linear-gradient(to right, #3b82f6 ${progress}%, #e2e8f0 ${progress}%)`
          }}
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest px-1">
          <span>T=0 (Start)</span>
          <span className="text-brand-600">
            {progress === 100 ? 'Present State' : `Flow: ${progress}%`}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default TimeLapse;
