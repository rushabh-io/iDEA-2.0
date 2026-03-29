import networkx as nx
import pandas as pd
import statistics
from datetime import datetime

def build_graph(transactions: list) -> nx.DiGraph:
    G = nx.DiGraph()
    for txn in transactions:
        G.add_node(str(txn['source']))
        G.add_node(str(txn['target']))
        G.add_edge(
            str(txn['source']), 
            str(txn['target']),
            amount=txn['amount'],
            date=txn['date'],
            is_laundering=txn['is_laundering'],
            txn_id=txn['id']
        )
    return G

def run_all_detectors(session) -> dict:
    transactions = session.transactions
    if not transactions:
        return {'total_alerts': 0, 'all_alerts': []}

    G = build_graph(transactions)
    df = session.df

    circular = _detect_circular(G)
    fan_out = _detect_fan_out(G)
    fan_in = _detect_fan_in(G)
    smurfing = _detect_smurfing(df)
    velocity = _detect_velocity(G, df)
    anomaly = _detect_anomaly(df)
    bipartite = _detect_bipartite(df)

    all_alerts = (
        circular + fan_out + fan_in +
        smurfing + velocity + anomaly + bipartite
    )

    results = {
        'circular_flows': circular,
        'fan_out': fan_out,
        'fan_in': fan_in,
        'smurfing': smurfing,
        'velocity': velocity,
        'anomalies': anomaly,
        'bipartite': bipartite,
        'all_alerts': all_alerts,
        'total_alerts': len(all_alerts),
        'by_pattern': {
            'circular': len(circular),
            'fan_out': len(fan_out),
            'fan_in': len(fan_in),
            'smurfing': len(smurfing),
            'velocity': len(velocity),
            'anomaly': len(anomaly),
            'bipartite': len(bipartite)
        }
    }

    _update_account_risk_scores(session, all_alerts)
    _flag_suspicious_transactions(session, circular)

    return results

def _detect_circular(G: nx.DiGraph) -> list:
    results = []
    try:
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            if 3 <= len(cycle) <= 7:
                amounts = []
                gt_confirmed = False
                for i in range(len(cycle)):
                    src = cycle[i]
                    dst = cycle[(i + 1) % len(cycle)]
                    if G.has_edge(src, dst):
                        edge = G[src][dst]
                        amounts.append(edge.get('amount', 0))
                        if edge.get('is_laundering', 0) == 1:
                            gt_confirmed = True
                
                total = sum(amounts)
                risk = min(
                    20 + len(cycle) * 5 +
                    (40 if total > 500000 else 20 if total > 100000 else 0),
                    100
                )
                results.append({
                    'type': 'circular_flow',
                    'cycle': cycle,
                    'account_id': cycle[0],
                    'hop_count': len(cycle),
                    'total_amount': round(total, 2),
                    'risk_score': risk,
                    'ground_truth_confirmed': gt_confirmed,
                    'description': f"${total:,.0f} circular flow across {len(cycle)} accounts"
                })
    except Exception as e:
        print(f"Circular flow error: {e}")
    return results

def _detect_fan_out(G: nx.DiGraph, min_targets: int = 5) -> list:
    results = []
    for node in G.nodes():
        out_neighbors = list(G.successors(node))
        if len(out_neighbors) >= min_targets:
            total = sum(G[node][n].get('amount', 0) for n in out_neighbors)
            risk = min(30 + len(out_neighbors) * 8, 100)
            results.append({
                'type': 'fan_out',
                'account_id': node,
                'target_count': len(out_neighbors),
                'total_amount': round(total, 2),
                'risk_score': risk,
                'description': f"Account {str(node)[:8]} sent to {len(out_neighbors)} different accounts"
            })
    return results

def _detect_fan_in(G: nx.DiGraph, min_sources: int = 5) -> list:
    results = []
    for node in G.nodes():
        in_neighbors = list(G.predecessors(node))
        if len(in_neighbors) >= min_sources:
            total = sum(G[n][node].get('amount', 0) for n in in_neighbors)
            risk = min(30 + len(in_neighbors) * 8, 100)
            results.append({
                'type': 'fan_in',
                'account_id': node,
                'source_count': len(in_neighbors),
                'total_received': round(total, 2),
                'risk_score': risk,
                'description': f"Account {str(node)[:8]} received from {len(in_neighbors)} different accounts"
            })
    return results

def _detect_smurfing(df: pd.DataFrame) -> list:
    if 'amount' not in df.columns:
        return []
    THRESHOLD = 10000
    LOWER = 8500
    window = df[(df['amount'] >= LOWER) & (df['amount'] < THRESHOLD)]
    if window.empty:
        return []
        
    grouped = window.groupby('from_acc')
    results = []
    for acc_id, group in grouped:
        if len(group) >= 3:
            risk = min(40 + len(group) * 10, 100)
            results.append({
                'type': 'smurfing',
                'account_id': str(acc_id),
                'transaction_count': len(group),
                'amounts': group['amount'].tolist(),
                'total_value': round(group['amount'].sum(), 2),
                'risk_score': risk,
                'description': f"{len(group)} transactions between $8,500–$9,999 from account {str(acc_id)[:8]}"
            })
    return results

def _detect_velocity(G: nx.DiGraph, df: pd.DataFrame) -> list:
    if 'date' not in df.columns:
        return []
    results = []
    try:
        nodes = list(G.nodes())
        limit = min(len(nodes), 200)
        for src in nodes[:limit]:
            for dst in nodes[:limit]:
                if src == dst:
                    continue
                try:
                    paths = list(nx.all_simple_paths(G, src, dst, cutoff=5))
                    for path in paths:
                        if len(path) < 3:
                            continue
                        dates = []
                        amounts = []
                        for i in range(len(path) - 1):
                            if G.has_edge(path[i], path[i+1]):
                                d = G[path[i]][path[i+1]].get('date', '')
                                a = G[path[i]][path[i+1]].get('amount', 0)
                                if d: dates.append(d)
                                amounts.append(a)
                        
                        if len(dates) < 2: continue
                        parsed = sorted([
                            datetime.strptime(d, '%Y-%m-%d') 
                            for d in dates if d and len(d) == 10
                        ])
                        if not parsed: continue
                        
                        days = (parsed[-1] - parsed[0]).days
                        if days <= 7:
                            risk = min(90 - days * 5, 100)
                            results.append({
                                'type': 'velocity',
                                'account_id': src,
                                'chain': path,
                                'hops': len(path) - 1,
                                'days_span': days,
                                'total_amount': round(sum(amounts), 2),
                                'risk_score': risk,
                                'description': f"${sum(amounts):,.0f} moved through {len(path)-1} accounts in {days} days"
                            })
                            if len(results) >= 50:
                                return results
                except:
                    continue
    except Exception as e:
        print(f"Velocity error: {e}")
    return results

def _detect_anomaly(df: pd.DataFrame) -> list:
    if 'amount' not in df.columns or len(df) < 10:
        return []
    amounts = df['amount'].dropna().tolist()
    if len(amounts) < 2:
        return []
    try:
        mean = statistics.mean(amounts)
        stdev = statistics.stdev(amounts)
        if stdev == 0:
            return []
    except:
        return []
        
    results = []
    for _, row in df.iterrows():
        z = abs((row['amount'] - mean) / stdev)
        if z > 2.5:
            risk = min(int(z * 20), 100)
            results.append({
                'type': 'anomaly',
                'account_id': str(row['from_acc']),
                'amount': round(float(row['amount']), 2),
                'z_score': round(z, 2),
                'risk_score': risk,
                'description': f"${row['amount']:,.0f} is {z:.1f} standard deviations above network mean"
            })
    return results[:100]

def _detect_bipartite(df: pd.DataFrame) -> list:
    if 'from_bank' not in df.columns or 'to_bank' not in df.columns:
        return []
    results = []
    grouped = df.groupby(['from_bank', 'to_bank'])
    for (bank_a, bank_b), group in grouped:
        if bank_a == bank_b:
            continue
        senders = group['from_acc'].nunique()
        receivers = group['to_acc'].nunique()
        total = len(group)
        if (senders >= 2 and receivers >= 2 and total >= senders * receivers):
            risk = min(40 + total * 3, 100)
            results.append({
                'type': 'bipartite',
                'account_id': str(group['from_acc'].iloc[0]),
                'bank_a': str(bank_a),
                'bank_b': str(bank_b),
                'senders': senders,
                'receivers': receivers,
                'total_transactions': total,
                'risk_score': risk,
                'description': f"Complete bipartite pattern: {senders} accounts in Bank {bank_a} each paying all {receivers} accounts in Bank {bank_b}"
            })
    return results

def _update_account_risk_scores(session, all_alerts: list) -> None:
    risk_map = {}
    flag_map = {}
    for alert in all_alerts:
        acc_id = str(alert.get('account_id', ''))
        if not acc_id: continue
        
        existing = risk_map.get(acc_id, 0)
        risk_map[acc_id] = max(existing, alert.get('risk_score', 0))
        if acc_id not in flag_map:
            flag_map[acc_id] = []
        flag_map[acc_id].append(alert.get('type', ''))

    for acc in session.accounts:
        acc_id = str(acc['id'])
        if acc_id in risk_map:
            acc['risk_score'] = risk_map[acc_id]
            acc['suspicious'] = True
            flags = flag_map.get(acc_id, [])
            acc['velocity_flag'] = 'velocity' in flags
            acc['fan_out_flag'] = 'fan_out' in flags
            acc['fan_in_flag'] = 'fan_in' in flags
            acc['gather_scatter_flag'] = 'gather_scatter' in flags

def _flag_suspicious_transactions(session, circular_flows: list) -> None:
    suspicious_pairs = set()
    for cycle in circular_flows:
        nodes = cycle.get('cycle', [])
        for i in range(len(nodes)):
            a = str(nodes[i])
            b = str(nodes[(i+1) % len(nodes)])
            suspicious_pairs.add((a, b))
            
    for txn in session.transactions:
        if (str(txn['source']), str(txn['target'])) in suspicious_pairs:
            txn['suspicious'] = True
            txn['risk_score'] = max(txn.get('risk_score', 0), 70)
            txn['flag'] = 'CIRCULAR_FLOW'

def get_validation_metrics(session) -> dict:
    if not session.has_labels:
        return {
            'available': False,
            'message': 'No fraud labels in uploaded CSV. Add an is_laundering column (0/1) to see precision/recall metrics.'
        }
    
    df = session.df
    detection = session.detection_results
    if not detection:
        return {'available': False, 'message': 'Run analysis first'}
        
    flagged_ids = set()
    for alert in detection.get('all_alerts', []):
        acc_id = str(alert.get('account_id', ''))
        if acc_id:
            flagged_ids.add(acc_id)

    tp = fp = fn = tn = 0
    fraud_col = 'is_fraud' if 'is_fraud' in df.columns else 'is_laundering'
    all_accounts = set(
        df['from_acc'].astype(str).tolist() + 
        df['to_acc'].astype(str).tolist()
    )
    labeled_fraud = set(
        df[df[fraud_col]==1]['from_acc'].astype(str).tolist() +
        df[df[fraud_col]==1]['to_acc'].astype(str).tolist()
    )
    
    for acc in all_accounts:
        predicted = acc in flagged_ids
        actual = acc in labeled_fraud
        if predicted and actual: tp += 1
        elif predicted and not actual: fp += 1
        elif not predicted and actual: fn += 1
        else: tn += 1

    total = tp + fp + fn + tn
    precision = round(tp/(tp+fp)*100, 1) if (tp+fp) > 0 else 0
    recall = round(tp/(tp+fn)*100, 1) if (tp+fn) > 0 else 0
    f1 = round(2*precision*recall/(precision+recall), 1) if (precision+recall) > 0 else 0
    accuracy = round((tp+tn)/total*100, 1) if total > 0 else 0

    return {
        'available': True,
        'precision_pct': precision,
        'recall_pct': recall,
        'f1_score': f1,
        'accuracy_pct': accuracy,
        'confusion_matrix': {
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn
        },
        'total_transactions': total,
        'total_laundering_in_dataset': tp + fn,
        'source': 'csv_upload'
    }
