// Mock data for instant local rendering without Neo4j
// This simulates the exact shape that all API endpoints return

// ── Accounts (nodes) ──
const BANKS = ['HSBC', 'Deutsche Bank', 'Barclays', 'UBS', 'Credit Suisse', 'BNP Paribas', 'JPMorgan', 'Citi', 'Standard Chartered', 'Wells Fargo'];
const COUNTRIES = ['Cayman Islands', 'British Virgin Islands', 'Panama', 'United States', 'United Kingdom', 'Switzerland', 'Singapore', 'Germany', 'Seychelles', 'Belize'];

function makeAccount(id, bank, suspicious, riskScore, mlScore, flags = {}) {
  return {
    data: {
      id, bank, type: 'Account',
      name: `Account ${id.slice(-6)}`,
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      suspicious,
      risk_score: riskScore,
      ml_risk_score: mlScore,
      ml_prediction: mlScore > 50 ? 'LAUNDERING' : 'CLEAN',
      label: `${bank}\n*${id.slice(-6)}`,
      patterns: flags.patterns || [],
      pattern_count: (flags.patterns || []).length,
      fan_out_flag: flags.fan_out || false,
      fan_in_flag: flags.fan_in || false,
      gather_scatter_flag: flags.gather_scatter || false,
      scatter_gather_flag: flags.scatter_gather || false,
      velocity_flag: flags.velocity || false,
      codirector_flag: flags.codirector || false,
      pep_connected: flags.pep || false,
      layering_score: flags.layering || 0,
      flag: flags.flag || '',
    },
    classes: suspicious ? 'suspicious' : ''
  };
}

function makePerson(id, name, pep = false) {
  return {
    data: {
      id, name, type: 'Person',
      nationality: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      pep, label: name
    },
    classes: pep ? 'pep' : ''
  };
}

function makeEdge(src, tgt, amount, relType = 'TRANSACTION', suspicious = false) {
  return {
    data: {
      id: `${src}_${tgt}_${relType}_${Math.random().toString(36).slice(2,6)}`,
      source: src, target: tgt,
      amount, currency: 'USD',
      payment_format: 'Wire',
      date: '2024-09-15',
      is_laundering: suspicious ? 1 : 0,
      suspicious, rel_type: relType,
      risk_score: suspicious ? 100 : 0
    },
    classes: suspicious ? 'suspicious' : (relType === 'OWNS' ? 'owns' : relType === 'DIRECTOR_OF' ? 'director' : '')
  };
}

// ── Build the graph ──
// Shell network: A -> B -> C -> D -> A (CYCLE)
const shellA = makeAccount('80A1B2C30', 'HSBC', true, 95, 100, { flag: 'CIRCULAR_FLOW', patterns: ['CYCLE', 'FAN-OUT'], fan_out: true, layering: 3 });
const shellB = makeAccount('80D4E5F60', 'Deutsche Bank', true, 88, 98, { flag: 'CIRCULAR_FLOW', patterns: ['CYCLE', 'GATHER-SCATTER'], gather_scatter: true, layering: 2 });
const shellC = makeAccount('80G7H8I90', 'UBS', true, 92, 100, { flag: 'CIRCULAR_FLOW', patterns: ['CYCLE', 'STACK'], layering: 4 });
const shellD = makeAccount('80J1K2L30', 'Credit Suisse', true, 85, 95, { flag: 'CIRCULAR_FLOW', patterns: ['CYCLE'], layering: 2 });

// Fan-out hub: E sends to F, G, H, I, J
const fanHub = makeAccount('80M4N5O60', 'Barclays', true, 100, 100, { flag: 'FAN_OUT', patterns: ['FAN-OUT'], fan_out: true, velocity: true, layering: 5 });
const fanTarget1 = makeAccount('80P7Q8R90', 'BNP Paribas', true, 70, 82, { patterns: ['FAN-OUT'], fan_in: true });
const fanTarget2 = makeAccount('80S1T2U30', 'JPMorgan', true, 65, 78, { patterns: ['FAN-OUT'] });
const fanTarget3 = makeAccount('80V4W5X60', 'Citi', true, 60, 75, { patterns: ['FAN-OUT'] });
const fanTarget4 = makeAccount('80Y7Z8A90', 'Standard Chartered', true, 72, 85, { patterns: ['FAN-OUT'], pep: true });
const fanTarget5 = makeAccount('80B1C2D30', 'Wells Fargo', true, 55, 70, { patterns: ['FAN-OUT'] });

// Smurfing cluster: many small txns from K,L,M -> N
const smurfSrc1 = makeAccount('80E4F5G60', 'HSBC', true, 78, 88, { flag: 'SMURFING', patterns: ['RANDOM'], velocity: true });
const smurfSrc2 = makeAccount('80H7I8J90', 'Deutsche Bank', true, 75, 85, { flag: 'SMURFING', patterns: ['RANDOM'] });
const smurfSrc3 = makeAccount('80K1L2M30', 'Barclays', true, 72, 80, { flag: 'SMURFING', patterns: ['RANDOM'] });
const smurfDest = makeAccount('80N4O5P60', 'UBS', true, 90, 96, { flag: 'SMURFING', patterns: ['RANDOM', 'FAN-IN'], fan_in: true, layering: 3 });

// Bipartite network
const biA = makeAccount('80Q7R8S90', 'Credit Suisse', true, 82, 90, { flag: 'BIPARTITE', patterns: ['BIPARTITE'], codirector: true });
const biB = makeAccount('80T1U2V30', 'BNP Paribas', true, 80, 88, { flag: 'BIPARTITE', patterns: ['BIPARTITE'] });
const biC = makeAccount('80W4X5Y60', 'JPMorgan', true, 78, 86, { patterns: ['BIPARTITE', 'SCATTER-GATHER'], scatter_gather: true });
const biD = makeAccount('80Z7A8B90', 'Citi', true, 76, 84, { patterns: ['BIPARTITE'] });

// Clean accounts for contrast
const clean1 = makeAccount('81C1D2E30', 'HSBC', false, 5, 2, {});
const clean2 = makeAccount('81F4G5H60', 'Wells Fargo', false, 0, 0, {});
const clean3 = makeAccount('81I7J8K90', 'Barclays', false, 10, 5, {});
const clean4 = makeAccount('81L1M2N30', 'JPMorgan', false, 3, 1, {});

// Persons (UBOs)
const person1 = makePerson('PER_0001', 'Viktor Petrov', true);
const person2 = makePerson('PER_0002', 'Elena Kozlov', false);
const person3 = makePerson('PER_0003', 'James Chen', true);
const person4 = makePerson('PER_0004', 'Maria Santos', false);
const person5 = makePerson('PER_0005', 'Rashid Al-Farsi', false);

const allNodes = [
  shellA, shellB, shellC, shellD,
  fanHub, fanTarget1, fanTarget2, fanTarget3, fanTarget4, fanTarget5,
  smurfSrc1, smurfSrc2, smurfSrc3, smurfDest,
  biA, biB, biC, biD,
  clean1, clean2, clean3, clean4,
  person1, person2, person3, person4, person5
];

const allEdges = [
  // Circular flow (cycle)
  makeEdge('80A1B2C30', '80D4E5F60', 450000, 'TRANSACTION', true),
  makeEdge('80D4E5F60', '80G7H8I90', 448500, 'TRANSACTION', true),
  makeEdge('80G7H8I90', '80J1K2L30', 445000, 'TRANSACTION', true),
  makeEdge('80J1K2L30', '80A1B2C30', 440000, 'TRANSACTION', true),

  // Fan-out
  makeEdge('80M4N5O60', '80P7Q8R90', 195000, 'TRANSACTION', true),
  makeEdge('80M4N5O60', '80S1T2U30', 187000, 'TRANSACTION', true),
  makeEdge('80M4N5O60', '80V4W5X60', 210000, 'TRANSACTION', true),
  makeEdge('80M4N5O60', '80Y7Z8A90', 175000, 'TRANSACTION', true),
  makeEdge('80M4N5O60', '80B1C2D30', 165000, 'TRANSACTION', true),

  // Smurfing (many small txns)
  makeEdge('80E4F5G60', '80N4O5P60', 9200, 'TRANSACTION', true),
  makeEdge('80E4F5G60', '80N4O5P60', 9500, 'TRANSACTION', true),
  makeEdge('80H7I8J90', '80N4O5P60', 8900, 'TRANSACTION', true),
  makeEdge('80H7I8J90', '80N4O5P60', 9800, 'TRANSACTION', true),
  makeEdge('80K1L2M30', '80N4O5P60', 9100, 'TRANSACTION', true),
  makeEdge('80K1L2M30', '80N4O5P60', 9400, 'TRANSACTION', true),

  // Bipartite
  makeEdge('80Q7R8S90', '80W4X5Y60', 320000, 'TRANSACTION', true),
  makeEdge('80Q7R8S90', '80Z7A8B90', 280000, 'TRANSACTION', true),
  makeEdge('80T1U2V30', '80W4X5Y60', 350000, 'TRANSACTION', true),
  makeEdge('80T1U2V30', '80Z7A8B90', 310000, 'TRANSACTION', true),

  // Cross-cluster links
  makeEdge('80B1C2D30', '80E4F5G60', 120000, 'TRANSACTION', true),
  makeEdge('80Z7A8B90', '80A1B2C30', 95000, 'TRANSACTION', true),

  // Clean transactions
  makeEdge('81C1D2E30', '81F4G5H60', 2500, 'TRANSACTION', false),
  makeEdge('81I7J8K90', '81L1M2N30', 15000, 'TRANSACTION', false),
  makeEdge('81F4G5H60', '81I7J8K90', 8000, 'TRANSACTION', false),

  // Ownership links
  makeEdge('PER_0001', '80A1B2C30', 0, 'OWNS', false),
  makeEdge('PER_0001', '80D4E5F60', 0, 'OWNS', false),
  makeEdge('PER_0002', '80M4N5O60', 0, 'OWNS', false),
  makeEdge('PER_0003', '80Q7R8S90', 0, 'OWNS', false),
  makeEdge('PER_0003', '80T1U2V30', 0, 'OWNS', false),
  makeEdge('PER_0004', '81C1D2E30', 0, 'OWNS', false),
  makeEdge('PER_0005', '80Y7Z8A90', 0, 'DIRECTOR_OF', false),
  makeEdge('PER_0005', '80N4O5P60', 0, 'DIRECTOR_OF', false),
];

// ── Exported mock responses ──

export const mockGraph = { nodes: allNodes, edges: allEdges };

export const mockStats = {
  accounts: 76302,
  transactions: 55177,
  suspicious_txns: 5177,
  persons: 3815,
  total_suspicious_volume: 28450000,
  max_risk_score: 100,
  avg_risk_score: 12.4
};

export const mockAlerts = allNodes
  .filter(n => n.data.suspicious)
  .map(n => n.data);

export const mockValidation = {
  precision_pct: 87.3,
  recall_pct: 92.1,
  f1_score: 89.6,
  accuracy_pct: 94.8,
  confusion_matrix: {
    tp: 4769,
    fp: 698,
    fn: 408,
    tn: 49302
  },
  total_transactions: 55177,
  total_laundering_in_dataset: 5177
};

export const mockCases = [
  {
    id: 'CASE_A1B2C3D4', title: 'Circular Flow — Shell Network Alpha',
    status: 'OPEN', priority: 'High', assigned_to: 'Analyst Team A',
    notes: 'Detected 4-node cycle routing $1.8M through HSBC → Deutsche Bank → UBS → Credit Suisse.',
    created_at: '2024-09-15T10:30:00', updated_at: '2024-09-15T10:30:00',
    account_id: '80A1B2C30'
  },
  {
    id: 'CASE_E5F6G7H8', title: 'Fan-Out Hub — Barclays Dispersal',
    status: 'INVESTIGATING', priority: 'High', assigned_to: 'Analyst Team B',
    notes: 'Single account dispersed $932K across 5 accounts in one day. Velocity flag triggered.',
    created_at: '2024-09-14T14:15:00', updated_at: '2024-09-15T08:00:00',
    account_id: '80M4N5O60'
  },
  {
    id: 'CASE_I9J0K1L2', title: 'Smurfing Cluster — Sub-10K Structuring',
    status: 'OPEN', priority: 'Medium', assigned_to: 'Analyst Team A',
    notes: '6 transactions all just under $10K reporting threshold funneled into single UBS account.',
    created_at: '2024-09-13T09:45:00', updated_at: '2024-09-13T09:45:00',
    account_id: '80N4O5P60'
  },
  {
    id: 'CASE_M3N4O5P6', title: 'Bipartite Network — Cross-Border Layering',
    status: 'ESCALATED', priority: 'High', assigned_to: 'Senior Investigator',
    notes: 'Dense bilateral flow between Credit Suisse/BNP Paribas and JPMorgan/Citi. PEP connection identified.',
    created_at: '2024-09-12T16:00:00', updated_at: '2024-09-14T11:30:00',
    account_id: '80Q7R8S90'
  }
];

export const mockDetectionResults = {
  message: "All 13 detection algorithms completed",
  total_alerts: 1322,
  summary: {
    CIRCULAR_FLOW: 862, FAN_OUT: 112, FAN_IN: 94,
    GATHER_SCATTER: 53, SCATTER_GATHER: 75,
    BIPARTITE: 41, STACK: 70,
    SMURFING: 15, VELOCITY: 0,
    ANOMALY: 0, LAYERING: 0,
    PEP_NETWORK: 0, CODIRECTOR: 0
  }
};
