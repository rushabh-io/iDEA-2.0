import React from 'react';
import { motion } from 'framer-motion';

const LandingPage = ({ onEnter }) => {
  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 20 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 overflow-hidden font-sans"
    >
      {/* Soft Light Background Mesh Gradients */}
      <div className="absolute inset-0 opacity-60">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 40, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-200 rounded-full mix-blend-multiply filter blur-[100px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: 2 }}
          className="absolute bottom-10 right-1/4 w-[700px] h-[700px] bg-indigo-200 rounded-full mix-blend-multiply filter blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear', delay: 5 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[140px]"
        />
      </div>

      {/* Grid Pattern Overlay (Light Theme) */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDM5LjVoNDBNMzkuNSAwVjQwIiBzdHJva2U9InJnYmEoMTUsIDIzLCA0MiwgMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-100 z-0 mix-blend-multiply"></div>

      {/* 3D / Geometric Animated Shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Shape 1: Floating Glass Sphere */}
        <motion.div
           animate={{ y: [0, -40, 0], rotate: [0, 10, 0] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[15%] left-[20%] w-48 h-48 rounded-full border border-white/60 bg-gradient-to-br from-white/80 to-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(59,91,219,0.1),inset_0_0_20px_rgba(255,255,255,0.8)]"
        >
           {/* Reflection highlight */}
           <div className="absolute top-[15%] left-[15%] w-12 h-12 bg-white rounded-full opacity-60 filter blur-md"></div>
        </motion.div>

        {/* Shape 2: Tilted Isometric Glass Card */}
        <motion.div
           animate={{ y: [0, 30, 0], rotateX: [15, 25, 15], rotateY: [-20, -10, -20], rotateZ: [10, 5, 10] }}
           transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           className="absolute bottom-[20%] right-[15%] w-64 h-80 rounded-3xl border border-white/80 bg-white/40 backdrop-blur-xl shadow-[20px_20px_50px_rgba(15,23,42,0.05),inset_1px_1px_0_rgba(255,255,255,0.8)] flex flex-col justify-between p-6"
           style={{ transformPerspective: 1000 }}
        >
           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-indigo-50 flex items-center justify-center border border-white shadow-sm">
             <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
           </div>
           <div className="space-y-3">
              <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden"><div className="w-2/3 h-full bg-brand-400"></div></div>
              <div className="w-3/4 h-2 bg-slate-200/50 rounded-full"></div>
           </div>
        </motion.div>

        {/* Shape 3: Frosted 3D Ring */}
        <motion.div
           animate={{ y: [0, -20, 0], rotateX: [60, 40, 60], rotateZ: [0, 180, 360] }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute -top-[10%] right-[30%] w-72 h-72 rounded-full border-[24px] border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.05),inset_0_10px_20px_rgba(255,255,255,0.7)] backdrop-blur-md"
           style={{ transformPerspective: 800 }}
        />

        {/* Shape 4: Small bouncing pill */}
        <motion.div
          animate={{ y: [0, -15, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute bottom-[30%] left-[25%] w-32 h-12 rounded-full bg-gradient-to-r from-emerald-100 to-teal-50 border border-white shadow-[0_10px_20px_rgba(0,0,0,0.03)] flex items-center px-4 gap-2 backdrop-blur-sm"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          <div className="w-16 h-1.5 bg-emerald-200 rounded-full"></div>
        </motion.div>

      </div>

      {/* Main Content Pane */}
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        
        <motion.div variants={itemVariants} className="mb-6">
          <div className="w-20 h-20 rounded-[24px] bg-white p-1 shadow-[0_15px_35px_rgba(59,91,219,0.15)] ring-1 ring-slate-900/5 mx-auto hover:rotate-6 transition-transform duration-500 flex items-center justify-center group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <svg className="w-10 h-10 text-brand-600 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-6xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-brand-900 to-slate-800 tracking-tighter text-center mb-6 py-2">
          Nexara Intelligence
        </motion.h1>

        <motion.div variants={itemVariants} className="text-center max-w-2xl mb-12">
          <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed">
            Adaptive Anti-Money Laundering Platform. Real-time network analysis, machine learning detection, and automated compliance routing.
          </p>
        </motion.div>

        {/* Feature Pills (Light Theme) */}
        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4 mb-14">
          <div className="px-5 py-2.5 rounded-full border border-slate-200/60 bg-white/70 backdrop-blur-md text-slate-700 text-sm font-bold tracking-wide shadow-sm flex items-center gap-2.5 hover:shadow-md hover:bg-white transition-all">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]"></div> Live Graph Sync
          </div>
          <div className="px-5 py-2.5 rounded-full border border-slate-200/60 bg-white/70 backdrop-blur-md text-slate-700 text-sm font-bold tracking-wide shadow-sm flex items-center gap-2.5 hover:shadow-md hover:bg-white transition-all">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-[pulse_2s_infinite_100ms]"></div> ML Detection Loop
          </div>
          <div className="px-5 py-2.5 rounded-full border border-slate-200/60 bg-white/70 backdrop-blur-md text-slate-700 text-sm font-bold tracking-wide shadow-sm flex items-center gap-2.5 hover:shadow-md hover:bg-white transition-all">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-[pulse_2s_infinite_200ms]"></div> Auto-SAR Drafting
          </div>
        </motion.div>

        {/* Enter Button (Primary Pop) */}
        <motion.div variants={itemVariants}>
          <button 
            onClick={onEnter}
            className="group relative px-9 py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-extrabold text-lg tracking-wide shadow-[0_15px_30px_rgba(59,91,219,0.3)] hover:shadow-[0_20px_40px_rgba(59,91,219,0.4)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="relative flex items-center gap-3">
              Initialize System
              <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </motion.div>

        {/* Footer info */}
        <motion.div variants={itemVariants} className="mt-20 text-slate-400 text-xs font-bold tracking-[0.2em] uppercase text-center flex items-center gap-3 justify-center">
          <span className="w-10 h-px bg-slate-200"></span>
          Version 1.0.0 • Secured Environment
          <span className="w-10 h-px bg-slate-200"></span>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default LandingPage;
