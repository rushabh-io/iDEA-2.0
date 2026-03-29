import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import MetricCards from './components/dashboard/MetricCards';
import AccuracyCard from './components/dashboard/AccuracyCard';
import PatternBreakdown from './components/dashboard/PatternBreakdown';
import RiskDistribution from './components/dashboard/RiskDistribution';
import BranchRiskHeatmap from './components/dashboard/BranchRiskHeatmap';
import GraphCanvas from './components/graph/GraphCanvas';
import GraphControls from './components/graph/GraphControls';
import EntityDetails from './components/investigation/EntityDetails';
import ReportModal from './components/investigation/ReportModal';
import CasesPanel from './components/cases/CasesPanel';
import CaseCreationModal from './components/cases/CaseCreationModal';
import { ToastContainer } from './components/layout/Toast';


import { getGraph, getStats, getValidation, getAlerts, runDetection, simulate, checkBackendHealth, isBackendOnline } from './api/client';
import { useAnalysisSession } from './hooks/useAnalysisSession';
import { useLiveFeed } from './hooks/useLiveFeed';
import LiveFeedPanel from './components/investigation/LiveFeedPanel';
import CopilotSidebar from './components/copilot/CopilotSidebar';
import AnalysisBanner from './components/upload/AnalysisBanner';
import AnalysisUploadModal from './components/upload/AnalysisUploadModal';
import LandingPage from './components/layout/LandingPage';

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [casesLastUpdated, setCasesLastUpdated] = useState(Date.now());
  const [detecting, setDetecting] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const [analyseModalOpen, setAnalyseModalOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true/false = result
  const [activeView, setActiveView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [graphAction, setGraphAction] = useState(null); // Used to trigger zoom/fit across components

  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const {
    analysisMode,
    analysisStatus,
    analysisGraph,
    analysisStats,
    analysisAlerts,
    analysisMetrics,
    analysisRunning,
    startAnalysisMode,
    runDetection: runAnalysisDetection,
    stopAnalysisMode,
    createAnalysisReport
  } = useAnalysisSession();

  const { isRunning, events, startSimulation: startWSSimulation, stopSimulation: stopWSSimulation, clearEvents } = useLiveFeed();

  // Determine active data source
  const activeGraph = analysisMode ? (analysisGraph || { nodes: [], edges: [] }) : graphData;
  const activeStats = analysisMode ? analysisStats : stats;
  const activeAlerts = analysisMode ? analysisAlerts : alerts;
  const activeMetrics = analysisMode ? analysisMetrics : metrics;

  const loadData = async () => {
    try {
      const [sData, aData] = await Promise.all([
        getStats().catch(() => null),
        getAlerts().catch(() => [])
      ]);
      if (sData) setStats(sData);
      setAlerts(aData || []);
    } catch (e) {
      console.error("Initialization error:", e);
    }
  };

  const loadValidation = async () => {
    if (metrics) return; // already loaded
    try {
      const mData = await getValidation();
      setMetrics(mData);
    } catch (e) {
      console.error("Validation load error:", e);
    }
  };

  const loadGraph = async (force = false) => {
    if (!force && graphData.nodes.length > 0) return; // already loaded
    try {
      const gData = await getGraph();
      setGraphData(gData);
    } catch (e) {
      console.error("Graph load error:", e);
    }
  };

  useEffect(() => {
    checkBackendHealth().then(online => {
      setBackendOnline(online);
      loadData();
    });
  }, []);

  // Lazy load validation metrics when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard' && !analysisMode) loadValidation();
    if (activeTab === 'investigation' && !analysisMode) loadGraph();
  }, [activeTab, analysisMode]);

  const handleDetection = async () => {
    setDetecting(true);
    addToast('Running full network anomaly detection...', 'success');
    try {
      await runDetection();
      // Reset caches so they reload fresh
      setMetrics(null);
      setGraphData({ nodes: [], edges: [] });
      await Promise.all([
        loadData(), // Reload stats + alerts
        loadGraph(true),
        loadValidation()
      ]);
      addToast('Detection complete. Dashboard updated.', 'success');
    } catch (e) {
      addToast("Detection failed to run.", 'error');
    } finally {
      setDetecting(false);
    }
  };

  const handleSimulation = async () => {
    addToast('Injecting synthetic transaction...', 'success');
    try {
      await simulate();
      await Promise.all([
        loadData(),
        loadGraph(true)
      ]);
      addToast('Transaction successfully simulated and graph updated.', 'success');
      // Tell graph to show all to ensure the new tx is visible
      setActiveView('all');
    } catch (e) {
      addToast("Simulation failed.", 'error');
    }
  };

  // ----- Views -----

  const renderDashboard = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 custom-scrollbar page-transition">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="animate-fade-in-down">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-glow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {analysisMode ? 'Analysis Snapshot' : 'System Dashboard'}
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 ml-13 pl-1">
            {analysisMode
              ? `Deep analysis of ${analysisStatus?.filename || 'custom data'}`
              : 'Real-time overview of network typologies and model accuracy.'}
          </p>
        </div>

        {/* Metric Cards */}
        <MetricCards stats={activeStats} alerts={activeAlerts} />

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <PatternBreakdown alerts={activeAlerts} />
          <RiskDistribution alerts={activeAlerts} />
        </div>

        {/* Heatmap Row */}
        <BranchRiskHeatmap alerts={activeAlerts} />

        {/* Accuracy Card */}
        <div className="grid grid-cols-1 mt-6">
          <AccuracyCard metrics={activeMetrics} isAnalysis={analysisMode} />
        </div>

        {/* Footer spacer */}
        <div className="h-6"></div>
      </div>
    </div>
  );

  const renderInvestigation = () => (
    <div className="flex-1 flex overflow-hidden relative">
      <LiveFeedPanel 
        isRunning={isRunning} 
        events={events} 
        onStop={stopWSSimulation} 
        onClose={clearEvents}
      />
      <div className="flex-1 flex flex-col relative">
        <GraphControls 
          activeView={activeView}
          onFilterChange={setActiveView}
          onSearch={setSearchQuery}
          onZoomIn={() => setGraphAction({ type: 'zoom', value: 0.5, ts: Date.now() })}
          onZoomOut={() => setGraphAction({ type: 'zoom', value: -0.5, ts: Date.now() })}
          onFit={() => setGraphAction({ type: 'fit', ts: Date.now() })}
          onSimulateAttack={startWSSimulation}
        />
        <GraphCanvas 
          graphData={activeGraph} 
          onNodeClick={(data) => setSelectedEntity(data)} 
          activeView={activeView}
          searchQuery={searchQuery}
          graphAction={graphAction}
          isLive={isRunning}
          liveEvents={events}
        />
      </div>
      <Sidebar>
        <EntityDetails 
          entity={selectedEntity} 
          isAnalysis={analysisMode}
          onReportClick={() => setShowReportModal(true)}
          onCreateCase={() => setShowCaseModal(true)}
        />
      </Sidebar>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      <AnimatePresence mode="wait">
        {!hasEntered ? (
          <LandingPage key="landing" onEnter={() => setHasEntered(true)} />
        ) : (
          <motion.div 
            key="app" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex h-full w-full flex-col relative"
          >
            <TopBar 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              onDetect={handleDetection}
              onSimulate={handleSimulation}
              detecting={detecting}
              backendOnline={backendOnline}
              onAnalyseClick={() => setAnalyseModalOpen(true)}
              analysisMode={analysisMode}
              copilotOpen={copilotOpen}
              onToggleCopilot={() => setCopilotOpen(!copilotOpen)}
            />

            {analysisMode && (
              <AnalysisBanner
                filename={analysisStatus?.filename}
                rowCount={analysisStatus?.total_rows}
                detecting={analysisRunning}
                hasDetectionRan={activeAlerts.length > 0}
                onRunDetection={runAnalysisDetection}
                onStop={async () => {
                  await stopAnalysisMode();
                  loadGraph(true);
                  loadData();
                  getValidation().then(r => setMetrics(r)).catch(() => {});
                }}
              />
            )}
            
            <main className="flex-1 flex overflow-hidden relative">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 flex"
                  >
                    {renderDashboard()}
                  </motion.div>
                )}
                {activeTab === 'investigation' && (
                  <motion.div
                    key="investigation"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 flex"
                  >
                    {renderInvestigation()}
                  </motion.div>
                )}
                {activeTab === 'cases' && (
                  <motion.div
                    key="cases"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 flex"
                  >
                    <CasesPanel key={casesLastUpdated} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Modals */}
            {showReportModal && selectedEntity && (
              <ReportModal 
                entity={selectedEntity} 
                onClose={() => setShowReportModal(false)} 
                createReportFn={analysisMode ? createAnalysisReport : null}
                addToast={addToast}
              />
            )}
            
            {showCaseModal && selectedEntity && (
              <CaseCreationModal 
                entity={selectedEntity} 
                onClose={() => setShowCaseModal(false)}
                analysisMode={analysisMode}
                addToast={addToast}
                onSuccess={() => {
                  setShowCaseModal(false);
                  setCasesLastUpdated(Date.now()); // Force CasesPanel to re-fetch
                  setActiveTab('cases'); // Jump to cases view
                }}
              />
            )}

            {analyseModalOpen && (
              <AnalysisUploadModal
                onClose={() => setAnalyseModalOpen(false)}
                onUploadComplete={async (result) => {
                  setAnalyseModalOpen(false);
                  await startAnalysisMode(result);
                  addToast(`Analysis ready for ${result.filename}`, 'success');
                }}
              />
            )}

            <CopilotSidebar 
              isOpen={copilotOpen} 
              onClose={() => setCopilotOpen(false)}
              selectedEntity={selectedEntity}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
