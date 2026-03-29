from fastapi import APIRouter
from detection import circular_flow, fan_patterns, gather_scatter, bipartite_stack, smurfing, temporal, anomaly, layering, pep_mapper, codirector, fatf_jurisdiction, rapid_layering
from services.validation_service import get_accuracy_metrics
from core.database import db

router = APIRouter()

@router.post("/detect")
def run_all_detectors():
    results = {}
    total_alerts = 0
    
    # 1. Circular Flow
    circ = circular_flow.detect_circular_flows()
    results['CIRCULAR_FLOW'] = circ
    total_alerts += len(circ)
    
    # 2. Fan Patterns
    fan_out = fan_patterns.detect_fan_out()
    results['FAN_OUT'] = fan_out
    total_alerts += len(fan_out)
    
    fan_in = fan_patterns.detect_fan_in()
    results['FAN_IN'] = fan_in
    total_alerts += len(fan_in)
    
    # 3. Gather-Scatter Hubs
    hub1 = gather_scatter.detect_gather_scatter()
    results['GATHER_SCATTER'] = hub1
    total_alerts += len(hub1)
    
    hub2 = gather_scatter.detect_scatter_gather()
    results['SCATTER_GATHER'] = hub2
    total_alerts += len(hub2)
    
    # 4. Dense Networks
    bipart = bipartite_stack.detect_bipartite()
    results['BIPARTITE'] = bipart
    total_alerts += len(bipart)
    
    stack = bipartite_stack.detect_stack()
    results['STACK'] = stack
    total_alerts += len(stack)
    
    # 5. Smurfing / Structuring
    smurf = smurfing.detect_smurfing()
    results['SMURFING'] = smurf
    total_alerts += len(smurf)
    
    # 6. Temporal Velocity
    veloc = temporal.detect_velocity()
    results['VELOCITY'] = veloc
    total_alerts += len(veloc)
    
    # 7. Statistical Anomalies
    anom = anomaly.detect_anomalies()
    results['ANOMALY'] = anom
    total_alerts += len(anom)
    
    # 8. Structural Layering
    layers = layering.calculate_layering_scores()
    results['LAYERING'] = layers
    total_alerts += len(layers)
    
    # 9. PEPs & Directors
    peps = pep_mapper.map_pep_networks()
    results['PEP_NETWORK'] = peps
    total_alerts += len(peps)
    
    dirs = codirector.detect_codirector_networks()
    results['CODIRECTOR'] = dirs
    total_alerts += len(dirs)
    
    # 10. FATF Jurisdiction Risk
    fatf = fatf_jurisdiction.detect_fatf_risk()
    results['FATF_RISK'] = fatf
    total_alerts += len(fatf)
    
    # 11. Rapid Layering Chain
    rapid = rapid_layering.detect_rapid_layering()
    results['RAPID_LAYERING'] = rapid
    total_alerts += len(rapid)
    
    summary = {k: len(v) for k, v in results.items()}
    
    return {
        "message": "All 15 detection algorithms completed",
        "total_alerts": total_alerts,
        "summary": summary,
        "results": results
    }

@router.get("/detect/alerts")
def get_alerts():
    # Return top 100 suspicious accounts
    query = """
    MATCH (a:Account)
    WHERE a.suspicious = true OR a.risk_score > 0 OR a.ml_risk_score > 50
    RETURN a
    ORDER BY a.risk_score DESC, a.ml_risk_score DESC
    LIMIT 100
    """
    results = db.query(query)
    return [r['a'] for r in results]

@router.get("/validate")
def validate_metrics():
    return get_accuracy_metrics()
