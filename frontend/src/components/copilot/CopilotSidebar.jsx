import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendCopilotMessage } from '../../api/client';

const CopilotSidebar = ({ isOpen, onClose, selectedEntity }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AML Investigator Co-pilot. How can I help you analyze the current network or specific accounts?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await sendCopilotMessage({
        message: userMessage,
        context: {
          account_id: selectedEntity?.id,
          entity_type: selectedEntity?.type,
        }
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply || response.error || "No response" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error communicating with the Co-pilot." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute top-16 right-0 bottom-0 w-96 bg-white/95 backdrop-blur-xl border-l border-slate-200/60 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-40 flex flex-col"
        >
          {/* Header */}
          <div className="h-14 border-b border-slate-200/60 flex items-center justify-between px-4 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="font-bold text-slate-800 tracking-tight text-sm">Investigator Co-pilot</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Context Banner */}
          {selectedEntity && (
            <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-2 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">Active Context:</span>
              <span className="font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded shadow-sm">
                {selectedEntity.id.slice(-6)} ({selectedEntity.type})
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${msg.role === 'user' ? 'text-slate-400' : 'text-indigo-400'}`}>
                  {msg.role === 'user' ? 'You' : 'Co-pilot'}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col max-w-[85%] mr-auto items-start">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-indigo-400">Co-pilot</div>
                <div className="bg-white border border-slate-200/60 p-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200/60 bg-white">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about compliance risks..." 
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 p-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 -rotate-90 transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">AI can make mistakes. Verify critical findings.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CopilotSidebar;
