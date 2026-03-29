import React, { useState } from 'react';

const CaseForm = ({ caseItem, onSave, onCancel }) => {
  const [status, setStatus] = useState(caseItem.status);
  const [notes, setNotes] = useState(caseItem.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(caseItem.id, { status, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select 
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="CLOSED">Closed (No Match)</option>
          <option value="ESCALATED">Escalated (SAR Required)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Investigation Notes</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 custom-scrollbar"
          placeholder="Document investigation findings, verified entities, and follow-up actions..."
        ></textarea>
      </div>
      
      <div className="flex space-x-3 pt-4 border-t border-slate-100">
        <button 
          type="submit"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 w-full shadow-sm"
        >
          Save Updates
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 w-full"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CaseForm;
