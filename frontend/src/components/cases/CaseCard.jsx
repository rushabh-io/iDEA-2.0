import React from 'react';

const CaseCard = ({ caseItem, onClick }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-slate-100 text-slate-700';
      case 'INVESTIGATING': return 'bg-indigo-100 text-indigo-700';
      case 'CLOSED': return 'bg-emerald-100 text-emerald-700';
      case 'ESCALATED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-brand-300"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-slate-900 text-lg">{caseItem.title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getPriorityColor(caseItem.priority)}`}>
          {caseItem.priority}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 line-clamp-2 mb-4">{caseItem.notes || "No standard operating notes provided."}</p>
      
      <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">{caseItem.id}</span>
          <span className="text-slate-300">•</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getStatusColor(caseItem.status)}`}>
            {caseItem.status}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">Assigned: {caseItem.assigned_to}</span>
          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase border border-brand-200">
            {caseItem.assigned_to.charAt(0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseCard;
