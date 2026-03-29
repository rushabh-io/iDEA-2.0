def get_cytoscape_elements(session) -> dict:
    nodes = []
    edges = []

    account_risk = {}
    account_flags = {}

    if session.detection_results:
        for result in session.detection_results.get('all_alerts', []):
            acc_id = result.get('account_id') or result.get('hub_id') or result.get('source_id')
            if acc_id:
                existing = account_risk.get(str(acc_id), 0)
                account_risk[str(acc_id)] = max(existing, result.get('risk_score', 0))
                if str(acc_id) not in account_flags:
                    account_flags[str(acc_id)] = []
                account_flags[str(acc_id)].append(result.get('type', ''))

    for acc in session.accounts:
        acc_id = str(acc['id'])
        risk = account_risk.get(acc_id, acc['risk_score'])
        flags = account_flags.get(acc_id, [])
        is_suspicious = acc['suspicious'] or risk > 0

        nodes.append({
            'data': {
                'id': acc_id,
                'name': acc['name'],
                'bank': acc['bank'],
                'country': acc.get('country', 'Unknown'),
                'fatf_risk': acc.get('fatf_risk', 'UNKNOWN'),
                'suspicious': is_suspicious,
                'risk_score': risk,
                'pep_connected': 'pep_network' in flags,
                'velocity_flag': 'velocity' in flags,
                'fan_out_flag': 'fan_out' in flags,
                'fan_in_flag': 'fan_in' in flags,
                'gather_scatter_flag': 'gather_scatter' in flags,
                'codirector_flag': 'codirector' in flags,
                'type': 'Account',
                'ml_risk_score': acc.get('ml_risk_score', 0),
                'ml_prediction': acc.get('ml_prediction', 'UNKNOWN'),
                'source': 'csv_upload'
            }
        })

    suspicious_pairs = set()
    if session.detection_results:
        for cycle in session.detection_results.get('circular_flows', []):
            cycle_nodes = cycle.get('cycle', [])
            for i in range(len(cycle_nodes)):
                a = str(cycle_nodes[i])
                b = str(cycle_nodes[(i + 1) % len(cycle_nodes)])
                suspicious_pairs.add((a, b))

    for txn in session.transactions:
        is_susp = (
            txn['suspicious'] or
            (str(txn['source']), str(txn['target'])) in suspicious_pairs
        )
        edges.append({
            'data': {
                'id': txn['id'],
                'source': str(txn['source']),
                'target': str(txn['target']),
                'rel_type': 'TRANSACTION',
                'amount': txn['amount'],
                'currency': txn['currency'],
                'payment_format': txn['payment_format'],
                'date': txn['date'],
                'is_laundering': txn['is_laundering'],
                'suspicious': is_susp,
                'risk_score': txn['risk_score'],
                'flag': txn['flag']
            }
        })

    return {'nodes': nodes, 'edges': edges}

def get_stats(session) -> dict:
    s = session.stats
    detection = session.detection_results

    total_alerts = 0
    if detection:
        total_alerts = detection.get('total_alerts', 0)

    max_risk = 0
    if session.accounts:
        risks = [a.get('risk_score', 0) for a in session.accounts]
        if risks:
            max_risk = max(risks)

    return {
        'accounts': s.get('total_accounts', 0),
        'transactions': s.get('total_transactions', 0),
        'suspicious_txns': s.get('fraud_transactions', 0),
        'persons': 0,
        'total_suspicious_volume': s.get('suspicious_volume', 0),
        'max_risk_score': max_risk,
        'avg_risk_score': 0,
        'source': 'csv_upload',
        'filename': session.filename,
        'total_alerts': total_alerts
    }
