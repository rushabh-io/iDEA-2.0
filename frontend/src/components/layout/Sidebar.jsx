import React from 'react';
import { motion } from 'framer-motion';

const Sidebar = ({ children }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-[340px] bg-white/80 backdrop-blur-xl border-l border-white/40 h-full flex flex-col shrink-0 z-30 overflow-hidden relative shadow-[-10px_0_30px_rgba(15,23,42,0.04)]"
    >
      <div className="flex-1 overflow-y-auto w-full p-5 custom-scrollbar">
        {children}
      </div>
    </motion.div>
  );
};

export default Sidebar;
