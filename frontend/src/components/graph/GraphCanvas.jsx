import React, { useRef, useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { motion } from 'framer-motion';
import { cytoscapeStyles } from '../../utils/cytoscapeStyles';
import { formatCurrency } from '../../utils/formatters';
import TimeLapse from './TimeLapse';

const GraphCanvas = ({ graphData, onNodeClick, activeView = 'all', searchQuery = '', graphAction = null, isLive = false, liveEvents = [], onLiveToggle = null }) => {
  const cyRef = useRef(null);
  const [timeProgress, setTimeProgress] = useState(100);

  // Tooltip setup instance scoped
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    // Add tooltip div if it doesn't exist
    let tooltip = document.getElementById('cy-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'cy-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      tooltip.style.backdropFilter = 'blur(12px)';
      tooltip.style.WebkitBackdropFilter = 'blur(12px)';
      tooltip.style.border = '1px solid rgba(255, 255, 255, 0.6)';
      tooltip.style.borderRadius = '12px';
      tooltip.style.padding = '10px 14px';
      tooltip.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.08)';
      tooltip.style.zIndex = '50';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.display = 'none';
      tooltip.style.fontFamily = 'Inter, sans-serif';
      tooltip.style.fontSize = '12px';
      tooltip.style.color = '#0f172a';
      tooltip.style.transition = 'opacity 0.2s ease';
      document.body.appendChild(tooltip);
    }
    
    // Node hover
    cy.on('mouseover', 'node', (e) => {
      const node = e.target;
      const data = node.data();
      
      let html = `<div class="font-bold text-[13px] mb-1.5 tracking-tight text-slate-800">${data.id}</div>`;
      if (data.type === 'Person') {
        html += `<div class="text-slate-500 font-medium mb-1">${data.name || ''}</div>`;
        if (data.pep) html += `<span class="bg-pink-100 border border-pink-200 text-pink-700 font-bold px-2 py-0.5 rounded shadow-sm text-[10px] uppercase tracking-wider">PEP</span>`;
      } else {
        html += `<div class="text-slate-500 font-medium mb-1">${data.bank || ''}</div>`;
        const score = Math.max(data.risk_score || 0, data.ml_risk_score || 0);
        html += `<div class="flex items-center gap-1.5 mt-1 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-${score > 60 ? 'red' : 'emerald'}-500 shadow-sm shadow-${score > 60 ? 'red' : 'emerald'}-500/50"></span> Risk: ${score}</div>`;
      }

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
      tooltip.style.left = e.originalEvent.pageX + 15 + 'px';
      tooltip.style.top = e.originalEvent.pageY + 15 + 'px';
    });
    
    cy.on('mouseout', 'node', () => {
      tooltip.style.display = 'none';
      tooltip.style.opacity = '0';
    });
    
    // Edge hover
    cy.on('mouseover', 'edge', (e) => {
      const edge = e.target;
      const data = edge.data();
      
      let html = "";
      if (data.rel_type === 'TRANSACTION') {
        html = `
          <div class="font-extrabold text-[14px] text-slate-800 tracking-tight">${formatCurrency(data.amount)}</div>
          <div class="text-slate-500 font-medium mt-1 text-[11px]">${data.date || ''}</div>
          ${data.flag ? `<div class="text-red-700 mt-2 font-bold bg-red-100/80 border border-red-200 inline-block px-1.5 py-0.5 rounded shadow-sm text-[10px] uppercase">${data.flag}</div>` : ''}
        `;
      } else if (data.rel_type === 'OWNS') {
         html = `<div class="font-extrabold text-[13px] text-slate-800">${data.percentage}% <span class="text-slate-500 font-medium">Ownership</span></div>`;
      } else {
         html = `<div class="font-bold text-[13px] text-slate-700">${data.role || 'Director'}</div>`;
      }

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
      tooltip.style.left = e.originalEvent.pageX + 15 + 'px';
      tooltip.style.top = e.originalEvent.pageY + 15 + 'px';
    });
    
    cy.on('mouseout', 'edge', () => {
      tooltip.style.display = 'none';
      tooltip.style.opacity = '0';
    });
    
    cy.on('mousemove', (e) => {
       if(tooltip.style.display === 'block') {
           tooltip.style.left = e.originalEvent.pageX + 15 + 'px';
           tooltip.style.top = e.originalEvent.pageY + 15 + 'px';
       }
    });

    // Node Click
    cy.on('tap', 'node', (e) => {
      const nodeData = e.target.data();
      if(onNodeClick) {
        onNodeClick(nodeData);
      }
      
      // Highlight neighbors
      cy.elements().removeClass('highlighted');
      e.target.neighborhood('edge').addClass('highlighted');
    });
    
    cy.on('tap', (e) => {
      if (e.target === cy) {
        if(onNodeClick) onNodeClick(null);
        cy.elements().removeClass('highlighted');
      }
    });
    
    return () => {
      cy.removeAllListeners();
    };
  }, [graphData, onNodeClick]);

  // --- Handle View Filters ---
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    // First, make everything visible
    cy.elements().removeClass('hidden');
    
    if (activeView === 'all') {
      // Nothing to hide based on view
    } else if (activeView === 'suspicious') {
      // Hide nodes that aren't suspicious UNLESS they are connected to a suspicious node
      cy.nodes().forEach(node => {
        if (!node.data('suspicious')) {
          const hasSusNeighbor = node.neighborhood('node[?suspicious]').length > 0;
          if (!hasSusNeighbor) node.addClass('hidden');
        }
      });
      // Also hide edges where BOTH ends are not suspicious
      cy.edges().forEach(edge => {
        if (!edge.source().data('suspicious') && !edge.target().data('suspicious')) {
          edge.addClass('hidden');
        }
      });
    } else if (activeView === 'ownership') {
      // Hide all non-ownership edges and nodes not connected by them
      cy.edges().forEach(edge => {
        if (edge.data('rel_type') !== 'OWNS' && edge.data('rel_type') !== 'DIRECTOR_OF') {
          edge.addClass('hidden');
        }
      });
      cy.nodes().forEach(node => {
        // If it has no visible edges in this view, hide it
        if (node.connectedEdges(':visible').length === 0) {
          node.addClass('hidden');
        }
      });
    }

    // Apply Time filter (hide elements outside of timeProgress window)
    if (timeProgress < 100) {
      const edges = cy.edges();
      const numEdges = edges.length;
      const threshold = (timeProgress / 100) * numEdges;
      
      edges.forEach((edge, i) => {
        if (i > threshold) {
          edge.addClass('hidden');
        }
      });

      // Cleanup nodes with no connections
      cy.nodes().forEach(node => {
        if (node.connectedEdges(':visible').length === 0) {
          node.addClass('hidden');
        }
      });
    }

  }, [activeView, graphData, timeProgress]);

  // --- Handle Live Events ---
  useEffect(() => {
    if (!cyRef.current || !isLive || !liveEvents || liveEvents.length === 0) return;
    const cy = cyRef.current;
    
    const latestEvent = liveEvents[liveEvents.length - 1];
    if (!latestEvent) return;

    const sourceId = latestEvent.from_account;
    const targetId = latestEvent.to_account;
    const edgeId = latestEvent.txn_id || `edge_${Date.now()}`;

    // Add source if missing
    if (sourceId && cy.getElementById(sourceId).length === 0) {
      cy.add({ group: 'nodes', data: { id: sourceId, label: sourceId.slice(-6), type: 'Account', bank: 'Unknown' }, classes: 'live-node' });
    } else if (sourceId) {
      cy.getElementById(sourceId).addClass('live-node');
    }

    // Add target if missing
    if (targetId && cy.getElementById(targetId).length === 0) {
      cy.add({ group: 'nodes', data: { id: targetId, label: targetId.slice(-6), type: 'Account', bank: 'Unknown' }, classes: 'live-node' });
    } else if (targetId) {
       cy.getElementById(targetId).addClass('live-node');
    }
    
    // Add edge
    if (sourceId && targetId && cy.getElementById(edgeId).length === 0) {
      cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: sourceId,
          target: targetId,
          amount: latestEvent.amount,
          rel_type: 'TRANSACTION',
          is_suspicious: latestEvent.is_suspicious,
          flag: latestEvent.detection_fired
        },
        classes: latestEvent.is_suspicious ? 'live-edge suspicious' : 'live-edge'
      });
      
      // Animate edge color
      const edge = cy.getElementById(edgeId);
      edge.animate({
        style: { 
          'line-color': latestEvent.is_suspicious ? '#ef4444' : '#10b981', 
          'target-arrow-color': latestEvent.is_suspicious ? '#ef4444' : '#10b981' 
        }
      }, { duration: 800 });
      
      // Center newly added nodes softly
      if (liveEvents.length === 1 || latestEvent.is_suspicious) {
          cy.animate({
              center: { eles: edge },
              duration: 500
          });
      }
    }
  }, [liveEvents, isLive]);

  // --- Handle Search ---
  useEffect(() => {
    if (!cyRef.current || !searchQuery) return;
    const cy = cyRef.current;
    
    const target = cy.getElementById(searchQuery.trim());
    if (target.length > 0) {
      // Clear previous
      cy.elements().removeClass('highlighted');
      
      // Select & highlight
      target.select();
      target.addClass('highlighted');
      target.neighborhood('edge').addClass('highlighted');
      
      // Pan and zoom to node
      cy.animate({
        center: { eles: target },
        zoom: Math.max(cy.zoom(), 1.5),
        duration: 500,
        easing: 'ease-out-cubic'
      });
      
      // Trigger click to show details
      if (onNodeClick) onNodeClick(target.data());
    } else {
      // Not found flash/toast could go here
    }
  }, [searchQuery]); // Ignore onNodeClick in deps to avoid infinite loops

  // --- Handle Zoom/Fit Actions ---
  useEffect(() => {
    if (!cyRef.current || !graphAction) return;
    const cy = cyRef.current;
    
    if (graphAction.type === 'zoom') {
      cy.animate({
        zoom: cy.zoom() * (1 + graphAction.value),
        center: { x: cy.width() / 2, y: cy.height() / 2 },
        duration: 300
      });
    } else if (graphAction.type === 'fit') {
      cy.animate({
        fit: { padding: 50 },
        duration: 500
      });
    }
  }, [graphAction]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center h-full relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center justify-center bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-brand-100/50 to-brand-50/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/60">
            <svg className="w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">No graph data</span>
          <p className="text-sm font-medium text-slate-500 mt-2 text-center max-w-[200px]">Upload a dataset and run detection to view nodes.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-slate-50/50 relative overflow-hidden">
      <CytoscapeComponent 
        elements={CytoscapeComponent.normalizeElements(graphData)} 
        style={{ width: '100%', height: '100%' }}
        layout={{ name: 'cose', animate: false, randomize: true, nodeRepulsion: 400000, idealEdgeLength: 60 }}
        stylesheet={cytoscapeStyles}
        cy={(cy) => { cyRef.current = cy; }}
      />
      
      {/* Legend Overlay */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-xs z-10 w-56 hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-shadow duration-300"
      >
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Graph Legend
        </h4>
        <div className="space-y-2.5 text-slate-600 font-medium">
          <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 bg-gradient-to-br from-brand-400 to-brand-500 rounded border border-brand-200/50 shadow-sm"></div>Account</div>
          <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full shadow-sm"></div>Person / UBO</div>
          <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 bg-gradient-to-br from-red-500 to-red-600 rounded border border-red-300 shadow-sm ring-2 ring-red-100"></div>Suspicious Entity</div>
          <div className="w-full h-px bg-slate-200/60 my-2"></div>
          <div className="flex items-center gap-3"><div className="w-5 h-0.5 bg-slate-300 shadow-sm"></div>Transaction</div>
          <div className="flex items-center gap-3"><div className="w-5 h-[2px] border-t-2 border-dashed border-red-400"></div>Flagged Transfer</div>
          <div className="flex items-center gap-3"><div className="w-5 h-[2px] border-t-2 border-dotted border-amber-400"></div>Ownership Link</div>
        </div>
      </motion.div>

      {/* Time Lapse Overlay */}
      <TimeLapse onTimeChange={setTimeProgress} isLive={isLive} onLiveToggle={onLiveToggle} />
    </div>
  );
};

export default GraphCanvas;
