import React, { useState } from 'react';
import { openCase } from '../../api/client';

const CaseCreationModal = ({ entity, onClose, onSuccess, analysisMode = false, addToast }) => {
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');

  const nameToDisplay = entity.type === 'Person' ? entity.name : entity.id;
  const flags = Object.keys(entity)
    .filter(k => k.endsWith('_flag') && entity[k] === true)
    .map(k => k.replace('_flag', '').replace(/_/g, ' '));
  const suggestedTitle = flags.length > 0 
    ? `Suspected ${flags[0].toUpperCase()} - ${nameToDisplay.substring(0,8)}`
    : `Anomaly Investigation - ${nameToDisplay.substring(0,8)}`;

  const [title, setTitle] = useState(suggestedTitle);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await openCase({
        account_id: entity.id,
        title,
        priority,
        assigned_to: 'Investigator_1',
        notes
      });
      if (addToast) addToast(`Case created: ${title}`, 'success');
      onSuccess();
    } catch (err) {
      if (addToast) addToast("Failed to create case.", 'error');
      else alert("Failed to create case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Open Investigation Case</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-base">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Subject Entity</span>
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-slate-900 block">{nameToDisplay}</span>
              {analysisMode && (
                <span className="text-[10px] text-amber-600 font-bold uppercase">CSV Analysis Entity</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Case Title</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Priority</label>
            <div className="flex gap-3">
              {['Low', 'Medium', 'High'].map(p => (
                <label key={p} className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer text-sm font-medium transition-base ${
                  priority === p 
                    ? 'border-brand-500 bg-brand-50 text-brand-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="priority" 
                    value={p} 
                    checked={priority === p}
                    onChange={(e) => setPriority(e.target.value)}
                    className="sr-only" 
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Analyst Notes (Optional)</label>
            <textarea 
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial observations, flags, or requested action..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-base disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-base shadow-sm min-w-[120px] flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Open Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseCreationModal;
