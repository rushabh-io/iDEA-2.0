# Nexara — AI-Powered Financial Intelligence & AML Monitoring Platform

Nexara is an advanced, end-to-end Anti-Money Laundering (AML) platform that transforms traditional rule-based monitoring into an intelligent, graph-aware, and predictive system. It leverages sophisticated Graph Analytics, Explainable AI (XAI), and high-performance detection engines to uncover hidden financial crime patterns with precision.

---

## 🚀 Key Innovation Pillars

### 🧠 Graph Intelligence (Neo4j)
Nexara treats financial data as a connected ecosystem. Using **Neo4j**, it uncovers hidden relationships and complex laundering structures (like smurfing, layering, and circular flows) that traditional relational databases miss.

### 🛡️ 13+ Advanced Detection Engines
A comprehensive suite of algorithmic detectors focused on:
- **Circular Flow Detection**: Identifying funds returning to the source.
- **Fan-in/Fan-out (Layering)**: Detecting consolidation and rapid distribution.
- **Smurfing & Structuring**: Spotting frequent, small-value transactions below reporting thresholds.
- **Co-director & PEP Mapping**: Identifying high-risk Politically Exposed Persons and business relationship clusters.

### 🔍 Explainable AI (SHAP)
Nexara uses **SHAP (SHapley Additive exPlanations)** to ensure transparency. Every risk score is accompanied by an explanation of *why* an entity was flagged, providing investigators with clear, defensible evidence.

### 📊 Interactive Investigation Suite
An industry-grade dashboard featuring:
- **Graph Canvas**: Interactive **Cytoscape.js** visualization of transaction paths.
- **Risk Heatmaps**: Visual distribution of high-risk activities across branches and regions.
- **Automated Reporting**: Integrated workflows for Suspicious Activity Report (SAR) filing and LLM-powered (Claude/Groq) automated report generation.

---

## 🛠️ Technology Stack

| Layer | Tools & Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Cytoscape.js, Recharts, Framer Motion |
| **Backend** | FastAPI (Python), Neo4j (Graph), PostgreSQL, Redis |
| **AI / ML** | Scikit-learn, XGBoost, SHAP (Explainability), Groq, Anthropic Claude |
| **Data Ops** | NetworkX, Pandas, NumPy, python-multipart (CSV Analysis) |
| **Infra** | Docker & Docker Compose |

---

## 📂 Project Structure

```bash
nexara/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── api/              # API Core & ML/Graph Endpoints
│   │   ├── services/         # Validation, Report, & Graph Services
│   │   ├── ml/               # Training & Inference Pipelines
│   │   ├── graph/            # Neo4j Cypher & Graph Logic
│   │   └── data/             # CSV Pre-processors & Validators
│   └── models/               # Trained ML Weights (.pkl)
├── frontend/                 # React Vite Frontend
│   ├── src/
│   │   ├── components/       # Dashboard, Graph, & Case Management
│   │   ├── api/              # Axiors Client & Shared Types
│   │   └── data/             # Mock & Demo Data Sets
├── docker-compose.yml        # Orchestration (Neo4i, Redis, Postgres)
└── tasks.md                  # Development Phase Tracker
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (for Neo4j & Redis)

### Setup & Installation

1. **Clone & Environment Setup**
   ```bash
   cp .env.example .env  # Configure your keys (NEO4J, GROQ, ANTHROPIC)
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Database (Docker)**
   ```bash
   docker-compose up -d
   ```

---

## 👨‍💻 Contributing
Nexara is built with modularity in mind. All detection algorithms are located in `backend/app/api/detection.py`, allowing for easy extension of the AML ruleset.

---

