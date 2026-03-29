import axios from 'axios';
import {
  mockGraph, mockStats, mockValidation, mockAlerts,
  mockCases, mockDetectionResults
} from '../data/mockData';

// ════════════════════════════════════════
// Smart Mode: Try live backend first, fall back to mock if unavailable
// ════════════════════════════════════════

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Track backend availability
let _backendOnline = null; // null = unknown, true/false = checked

export const checkBackendHealth = async () => {
  try {
    await api.get('/health', { timeout: 10000 });
    _backendOnline = true;
    return true;
  } catch {
    _backendOnline = false;
    return false;
  }
};

export const isBackendOnline = () => _backendOnline;

// Helper: Try live backend first, fall back to mock if unavailable
const liveOrMock = async (apiFn, mockData) => {
  try {
    const result = await apiFn();
    _backendOnline = true;
    return result;
  } catch (err) {
    console.warn("Backend call failed, falling back to mock data.", err.message);
    _backendOnline = false;
    // Handle mock function if provided as a fallback (some exports like simulateLiveTransaction pass a function)
    return typeof mockData === 'function' ? mockData() : mockData;
  }
};

export const getGraph = () =>
  liveOrMock(
    () => api.get('/api/graph').then(res => res.data),
    mockGraph
  );

export const getStats = () =>
  liveOrMock(
    () => api.get('/api/graph/stats').then(res => res.data),
    mockStats
  );

export const simulate = () =>
  liveOrMock(
    () => api.post('/api/simulate').then(res => res.data),
    { message: 'Simulated transaction injected (mock)' }
  );

export const simulateLiveTransaction = async (nodes) => {
  if (!nodes || nodes.length < 2) return null;
  // Pick two random nodes
  const sourceNode = nodes[Math.floor(Math.random() * nodes.length)];
  let targetNode = nodes[Math.floor(Math.random() * nodes.length)];
  while(targetNode.data.id === sourceNode.data.id) {
     targetNode = nodes[Math.floor(Math.random() * nodes.length)];
  }

  const amount = Math.floor(Math.random() * 5000000) + 1000;
  const isSuspicious = Math.random() > 0.85;

  const newEdge = {
    data: {
      id: `live_txn_${Date.now()}`,
      source: sourceNode.data.id,
      target: targetNode.data.id,
      rel_type: 'TRANSACTION',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      flag: isSuspicious ? 'VELOCITY_SPIKE' : null,
      suspicious: isSuspicious
    }
  };

  return liveOrMock(
    () => Promise.resolve({ edge: newEdge }), // Mock only
    { edge: newEdge }
  );
};

export const runDetection = () =>
  liveOrMock(
    () => api.post('/api/detect').then(res => res.data),
    mockDetectionResults
  );

export const getAlerts = () =>
  liveOrMock(
    () => api.get('/api/detect/alerts').then(res => res.data),
    mockAlerts
  );

export const getValidation = () =>
  liveOrMock(
    () => api.get('/api/validate').then(res => res.data),
    mockValidation
  );

export const getOwnership = (id) =>
  liveOrMock(
    () => api.get(`/api/ownership/${id}`).then(res => res.data),
    {
      chains: [{
        depth: 2,
        links: [
          { owner: { id: 'PER_0001', name: 'Viktor Petrov', pep: true }, percentage: 75 },
          { owner: { id: 'PER_0002', name: 'Elena Kozlov', pep: false }, percentage: 51 },
          { target: { id } }
        ]
      }]
    }
  );

export const getUBO = (id) =>
  liveOrMock(
    () => api.get(`/api/ownership/ubo/${id}`).then(res => res.data),
    { ubo: { id: 'PER_0001', name: 'Viktor Petrov', nationality: 'Cayman Islands', pep: true, depth: 2 } }
  );

export const getReport = (id) =>
  liveOrMock(
    () => api.post(`/api/reports/${id}`).then(res => res.data),
    { account_id: id, report_text: `RISK LEVEL: Medium\n\nKEY FLAGS:\n• Elevated transaction volume\n• Cross-border fund transfers detected\n\nRECOMMENDED ACTION:\nSchedule enhanced due-diligence review within 30 days. Monitor transaction patterns for structuring behavior.`, generated_at: 'Mock', cached: false }
  );

export const getSAR = (id) =>
  liveOrMock(
    () => api.post(`/api/reports/sar/${id}`).then(res => res.data),
    { account_id: id, sar_text: `SUSPICIOUS ACTIVITY REPORT\n\nFiling Institution: Nexara AML Intelligence\nSubject: Account ${id}\nActivity Type: Potential Structuring / Layering\n\nNarrative: Initial analysis flags unusual transaction velocity and cross-border patterns. Full investigation recommended.\n\nAmount Involved: Under review\nDate Range: Last 90 days\nRecommended Action: Escalate to Compliance Officer for formal SAR filing.`, generated_at: 'Mock' }
  );

export const getCases = () =>
  liveOrMock(
    () => api.get('/api/cases').then(res => res.data),
    mockCases
  );

export const openCase = (data) => {
  const newId = 'CASE_NEW_' + Date.now().toString().slice(-6);
  const newCase = {
    id: newId,
    title: data.title || 'New Investigation',
    status: 'OPEN',
    priority: data.priority || 'Medium',
    assigned_to: data.assigned_to || 'Investigator_1',
    notes: data.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    account_id: data.account_id || 'Unknown'
  };
  mockCases.unshift(newCase); // Add to local mock array so it persists in UI

  return liveOrMock(
    () => api.post('/api/cases', data).then(res => res.data),
    { case_id: newId, status: 'OPEN' }
  );
};

export const updateCase = (id, data) => {
  const caseIndex = mockCases.findIndex(c => c.id === id);
  if (caseIndex !== -1) {
    mockCases[caseIndex] = { ...mockCases[caseIndex], ...data, updated_at: new Date().toISOString() };
  }

  return liveOrMock(
    () => api.patch(`/api/cases/${id}`, data).then(res => res.data),
    { status: 'success' }
  );
};

export const getCaseStats = () =>
  liveOrMock(
    () => api.get('/api/cases/stats').then(res => res.data),
    { OPEN: 2, INVESTIGATING: 1, CLOSED: 0, ESCALATED: 1 }
  );

export const trainModel = () =>
  liveOrMock(
    () => api.post('/api/ml/train').then(res => res.data),
    { f1: 0.896, accuracy: 0.948, precision: 0.873, recall: 0.921 }
  );

export const runMLPredictions = () =>
  liveOrMock(
    () => api.post('/api/ml/predict').then(res => res.data),
    { ml_flagged_accounts: 3170, total_accounts_scored: 76302 }
  );

export const getMLPrediction = (id) =>
  liveOrMock(
    () => api.get(`/api/ml/predict/${id}`).then(res => res.data),
    { account_id: id, ml_risk_score: 95, ml_prediction: 'LAUNDERING', confidence: 0.97 }
  );

export const getShapExplanation = (id) =>
  liveOrMock(
    () => api.get(`/api/ml/explain/${id}`).then(res => res.data),
    { explanation: [
      { feature: 'out_degree', shap_value: 0.15 },
      { feature: 'amount_ratio', shap_value: 0.08 },
      { feature: 'fan_out', shap_value: 0.05 }
    ] }
  );

export const sendCopilotMessage = (body) =>
  liveOrMock(
    () => api.post('/api/copilot', body).then(res => res.data),
    { reply: "Mock Copilot: I analyzed the account and found multiple layering patterns indicating potential structuring." }
  );

export const getFIUReport = (id) =>
  liveOrMock(
    () => api.post(`/api/reports/fiu/${id}`).then(res => res.data),
    { 
      goaml_xml: "<str><subject><account_id>" + id + "</account_id></subject></str>",
      narrative: "Mock FIU narrative generated."
    }
  );

// ════════════════════════════════════════
// CSV Upload — always hits real backend
// ════════════════════════════════════════

export const previewCSV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });
};

export const importCSV = (file, mapping = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (mapping) formData.append('mapping', JSON.stringify(mapping));
  return api.post('/api/upload/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  });
};

export const validateMapping = (mapping, filename) =>
  api.post('/api/upload/validate-mapping', { column_mapping: mapping, filename }, { timeout: 30000 });

export const downloadTemplate = () =>
  window.open(`${api.defaults.baseURL}/api/upload/template`);

// ════════════════════════════════════════
// CSV Analysis Mode — always hits real backend
// ════════════════════════════════════════

export const getAnalysisStatus = () =>
  api.get('/api/analysis/status');

export const previewForAnalysis = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/api/analysis/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });
};

export const uploadForAnalysis = (file, mapping = null) => {
  const fd = new FormData();
  fd.append('file', file);
  if (mapping) fd.append('mapping', JSON.stringify(mapping));
  return api.post('/api/analysis/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  });
};

export const runAnalysis = () =>
  api.post('/api/analysis/run');

export const getAnalysisGraph = () =>
  api.get('/api/analysis/graph');

export const getAnalysisStats = () =>
  api.get('/api/analysis/stats');

export const getAnalysisAlerts = () =>
  api.get('/api/analysis/alerts');

export const getAnalysisValidation = () =>
  api.get('/api/analysis/validate');

export const stopAnalysis = () =>
  api.delete('/api/analysis/stop');

export const getAnalysisDetectionSummary = () =>
  api.get('/api/analysis/detection-summary');

export const getAnalysisOwnership = (id) =>
  api.get(`/api/analysis/ownership/${id}`);

export const createAnalysisReport = (id) =>
  api.post(`/api/analysis/reports/${id}`);
