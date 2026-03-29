import React, { useState, useEffect } from 'react';
import { getOwnership } from '../../api/client';

const OwnershipChain = ({ accountId }) => {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOwnership = async () => {
      if (!accountId) return;
      setLoading(true);
      try {
        const data = await getOwnership(accountId);
        if (data && data.chains) {
          setChains(data.chains);
        }
      } catch (e) {
        console.error("Failed to fetch ownership:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnership();
  }, [accountId]);

  if (loading) return <div className="p-4 text-center text-sm text-slate-500">Scanning corporate registry...</div>;
  if (!chains || chains.length === 0) return <div className="p-4 text-center text-sm text-slate-500">No beneficial owners identified.</div>;

  return (
    <div className="bg-slate-50 rounded-xl p-4 mt-6 border border-slate-100">
      <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wider">Ultimate Beneficial Owners (UBO)</h3>
      
      <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
        {chains.map((chain, cIdx) => (
          <div key={cIdx} className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-0 w-0.5 bg-slate-200"></div>
            
            {chain.links.map((link, lIdx) => (
              <div key={lIdx} className="mb-3 relative">
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>
                
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center z-10 relative">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{link.owner?.name}</p>
                    <p className="text-xs text-slate-500">{link.owner?.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-600">{link.percentage}%</p>
                    {link.owner?.pep && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-2">PEP</span>
                    )}
                  </div>
                </div>
                
                {lIdx < chain.links.length - 1 && (
                  <div className="text-center py-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 rounded-full z-10 relative">
                      Owns
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnershipChain;
