"""
Build live-attack simulation sequences from an active analysis session.
All account IDs must exist in session.accounts (uploaded CSV graph).
"""
from __future__ import annotations

from collections import defaultdict
from typing import List, Dict, Optional, Set

LOWER_SMURF = 8500
THRESHOLD_SMURF = 10000

PATTERN_VIEW_MAP = {
    'circular_flow': 'circular_flow',
    'smurfing': 'smurfing',
    'fan_out': 'fan_out',
    'dormant_acct': 'dormant_acct',
    'geo_velocity': 'geo_velocity',
    'banker_collusion': 'banker_collusion',
    'all': 'all',
    'suspicious': 'all',
}


def _valid_ids(session) -> Set[str]:
    return {str(a['id']) for a in session.accounts}


def _bank_for(session, acc_id: str) -> str:
    for acc in session.accounts:
        if str(acc['id']) == str(acc_id):
            return str(acc.get('bank', 'Unknown'))
    return 'Unknown'


def _channel(txn: dict) -> str:
    fmt = str(txn.get('payment_format', '')).upper()
    if fmt in ('RTGS', 'NEFT', 'IMPS', 'ACH', 'WIRE'):
        return fmt
    return 'RTGS'


def _txn_to_event(
    txn: dict,
    step: int,
    is_suspicious: bool = False,
    detection_fired: Optional[str] = None,
    risk_score: Optional[int] = None,
) -> dict:
    return {
        'type': 'transaction',
        'txn_id': f'ANALYSIS_SIM_{step:03d}',
        'from_account': str(txn['source']),
        'to_account': str(txn['target']),
        'amount': float(txn['amount']),
        'bank_from': _bank_for(txn.get('_session'), str(txn['source'])) if txn.get('_session') else 'Unknown',
        'bank_to': _bank_for(txn.get('_session'), str(txn['target'])) if txn.get('_session') else 'Unknown',
        'timestamp': '',
        'channel': _channel(txn),
        'is_suspicious': is_suspicious,
        'detection_fired': detection_fired,
        'risk_score': risk_score,
    }


def _with_session(session, txn: dict) -> dict:
    t = dict(txn)
    t['_session'] = session
    return t


def _find_txn_between(session, source: str, target: str) -> Optional[dict]:
    for txn in session.transactions:
        if str(txn['source']) == source and str(txn['target']) == target:
            return _with_session(session, txn)
    return None


def _build_circular(session, alerts: list, valid: Set[str]) -> List[dict]:
    if not alerts:
        return []
    best = max(alerts, key=lambda a: a.get('risk_score', 0))
    cycle = [str(n) for n in best.get('cycle', [])]
    if len(cycle) < 3:
        return []

    events = []
    step = 1
    for i in range(len(cycle)):
        src, dst = cycle[i], cycle[(i + 1) % len(cycle)]
        if src not in valid or dst not in valid:
            continue
        txn = _find_txn_between(session, src, dst)
        if not txn:
            continue
        is_last = i == len(cycle) - 1
        events.append({
            'type': 'transaction',
            'txn_id': str(txn.get('id', f'ANALYSIS_SIM_{step:03d}')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': is_last,
            'detection_fired': 'circular_flow' if is_last else None,
            'risk_score': best.get('risk_score') if is_last else None,
        })
        step += 1
    return events


def _build_smurfing(session, alerts: list, valid: Set[str]) -> List[dict]:
    if not alerts:
        return []
    best = max(alerts, key=lambda a: a.get('risk_score', 0))
    source = str(best['account_id'])
    if source not in valid:
        return []

    txns = sorted(
        [
            t for t in session.transactions
            if str(t['source']) == source
            and LOWER_SMURF <= float(t['amount']) < THRESHOLD_SMURF
            and str(t['target']) in valid
        ],
        key=lambda t: str(t.get('date', '')),
    )
    if not txns:
        return []

    events = []
    for i, txn in enumerate(txns[:5]):
        src, dst = str(txn['source']), str(txn['target'])
        is_last = i == min(len(txns), 5) - 1
        events.append({
            'type': 'transaction',
            'txn_id': str(txn.get('id', f'ANALYSIS_SIM_{i + 1:03d}')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': is_last,
            'detection_fired': 'smurfing' if is_last else None,
            'risk_score': best.get('risk_score') if is_last else None,
        })
    return events


def _build_fan_out(session, alerts: list, valid: Set[str]) -> List[dict]:
    if not alerts:
        return []
    best = max(alerts, key=lambda a: a.get('risk_score', 0))
    hub = str(best['account_id'])
    if hub not in valid:
        return []

    seen_targets = set()
    txns = []
    for txn in session.transactions:
        if str(txn['source']) != hub:
            continue
        tgt = str(txn['target'])
        if tgt not in valid or tgt in seen_targets:
            continue
        seen_targets.add(tgt)
        txns.append(txn)
    txns = sorted(txns, key=lambda t: -float(t['amount']))[:5]
    if not txns:
        return []

    events = []
    for i, txn in enumerate(txns):
        src, dst = str(txn['source']), str(txn['target'])
        is_last = i == len(txns) - 1
        events.append({
            'type': 'transaction',
            'txn_id': str(txn.get('id', f'ANALYSIS_SIM_{i + 1:03d}')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': is_last,
            'detection_fired': 'fan_out' if is_last else None,
            'risk_score': best.get('risk_score') if is_last else None,
        })
    return events


def _follow_transaction_chain(session, start_id: str, valid: Set[str], max_hops: int = 5) -> List[dict]:
    chain = []
    current = start_id
    visited = {current}
    while len(chain) < max_hops:
        candidates = [
            t for t in session.transactions
            if str(t['source']) == current and str(t['target']) in valid
        ]
        if not candidates:
            break
        txn = max(candidates, key=lambda t: float(t['amount']))
        tgt = str(txn['target'])
        if tgt in visited:
            break
        chain.append(txn)
        visited.add(tgt)
        current = tgt
    return chain


def _build_geo_velocity(session, alerts: list, valid: Set[str]) -> List[dict]:
    chain_txns: List[dict] = []

    if alerts:
        best = max(alerts, key=lambda a: a.get('risk_score', 0))
        path = best.get('chain', [])
        if len(path) >= 3:
            for i in range(len(path) - 1):
                txn = _find_txn_between(session, str(path[i]), str(path[i + 1]))
                if txn:
                    chain_txns.append(txn)

    if not chain_txns:
        vel_accounts = sorted([a for a in valid if 'VELO' in a])
        best_chain = []
        for starter in vel_accounts:
            candidate = _follow_transaction_chain(session, starter, valid, max_hops=5)
            if len(candidate) > len(best_chain):
                best_chain = candidate
        chain_txns = best_chain

    if len(chain_txns) < 2:
        for acc_id in sorted(valid):
            chain_txns = _follow_transaction_chain(session, acc_id, valid, max_hops=5)
            if len(chain_txns) >= 3:
                break

    if not chain_txns:
        return []

    risk = 85
    events = []
    for i, txn in enumerate(chain_txns):
        src, dst = str(txn['source']), str(txn['target'])
        is_last = i == len(chain_txns) - 1
        events.append({
            'type': 'transaction',
            'txn_id': str(txn.get('id', f'ANALYSIS_SIM_{i + 1:03d}')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': is_last,
            'detection_fired': 'geo_velocity' if is_last else None,
            'risk_score': risk if is_last else None,
        })
    return events


def _build_dormant(session, valid: Set[str]) -> List[dict]:
    out_counts: Dict[str, list] = defaultdict(list)
    for txn in session.transactions:
        src = str(txn['source'])
        if src in valid:
            out_counts[src].append(txn)

    burst_candidates = [
        (src, txns[0])
        for src, txns in out_counts.items()
        if len(txns) == 1 and float(txns[0]['amount']) >= 100000
    ]
    if burst_candidates:
        src, txn = max(burst_candidates, key=lambda x: float(x[1]['amount']))
        dst = str(txn['target'])
        if dst not in valid:
            return []
        return [{
            'type': 'transaction',
            'txn_id': str(txn.get('id', 'ANALYSIS_SIM_001')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': True,
            'detection_fired': 'dormant_acct',
            'risk_score': 72,
        }]

    # Low-activity account: fewest outgoing txns with at least one transfer
    low_activity = sorted(out_counts.items(), key=lambda x: len(x[1]))
    if low_activity:
        src, txns = low_activity[0]
        txn = max(txns, key=lambda t: float(t['amount']))
        dst = str(txn['target'])
        if dst in valid:
            return [{
                'type': 'transaction',
                'txn_id': str(txn.get('id', 'ANALYSIS_SIM_001')),
                'from_account': src,
                'to_account': dst,
                'amount': float(txn['amount']),
                'bank_from': _bank_for(session, src),
                'bank_to': _bank_for(session, dst),
                'timestamp': '',
                'channel': _channel(txn),
                'is_suspicious': True,
                'detection_fired': 'dormant_acct',
                'risk_score': 65,
            }]
    return []


def _build_collusion(session, valid: Set[str]) -> List[dict]:
    flagged = [
        str(a['id']) for a in session.accounts
        if str(a['id']) in valid
        and (a.get('codirector_flag') or a.get('pep_connected') or a.get('pep'))
    ]

    events = []
    if len(flagged) >= 2:
        for txn in session.transactions:
            src, dst = str(txn['source']), str(txn['target'])
            if src in flagged and dst in valid:
                events.append(txn)
                if len(events) >= 3:
                    break

    if not events:
        bank_groups: Dict[str, list] = defaultdict(list)
        for acc in session.accounts:
            acc_id = str(acc['id'])
            if acc_id in valid:
                bank_groups[str(acc.get('bank', ''))].append(acc_id)
        for bank, ids in bank_groups.items():
            if bank and len(ids) >= 2:
                txn = _find_txn_between(session, ids[0], ids[1])
                if txn:
                    events = [txn]
                    break
                for txn in session.transactions:
                    if str(txn['source']) in ids and str(txn['target']) in ids:
                        events.append(txn)
                        if len(events) >= 3:
                            break
                if events:
                    break

    if not events:
        return []

    built = []
    for i, txn in enumerate(events[:3]):
        src, dst = str(txn['source']), str(txn['target'])
        is_last = i == min(len(events), 3) - 1
        built.append({
            'type': 'transaction',
            'txn_id': str(txn.get('id', f'ANALYSIS_SIM_{i + 1:03d}')),
            'from_account': src,
            'to_account': dst,
            'amount': float(txn['amount']),
            'bank_from': _bank_for(session, src),
            'bank_to': _bank_for(session, dst),
            'timestamp': '',
            'channel': _channel(txn),
            'is_suspicious': is_last,
            'detection_fired': 'banker_collusion' if is_last else None,
            'risk_score': 78 if is_last else None,
        })
    return built


def _pick_best_pattern(session) -> str:
    detection = session.detection_results or {}
    priority = [
        ('circular_flow', detection.get('circular_flows', [])),
        ('smurfing', detection.get('smurfing', [])),
        ('fan_out', detection.get('fan_out', [])),
        ('geo_velocity', detection.get('velocity', [])),
    ]
    best_type = None
    best_score = -1
    for ptype, items in priority:
        for item in items:
            score = item.get('risk_score', 0)
            if score > best_score:
                best_score = score
                best_type = ptype
    if best_type == 'velocity':
        return 'geo_velocity'
    return best_type or 'circular_flow'


def build_analysis_attack_sequence(session, pattern_view: str = 'all') -> List[dict]:
    """
    Build simulation events from uploaded CSV session data.
    Returns empty list if session inactive or pattern cannot be built.
    """
    if not session.active:
        return []

    detection = session.detection_results
    if not detection:
        return []

    valid = _valid_ids(session)
    view = PATTERN_VIEW_MAP.get(pattern_view, 'all')
    if view == 'all':
        view = _pick_best_pattern(session)

    if view == 'circular_flow':
        return _build_circular(session, detection.get('circular_flows', []), valid)
    if view == 'smurfing':
        return _build_smurfing(session, detection.get('smurfing', []), valid)
    if view == 'fan_out':
        return _build_fan_out(session, detection.get('fan_out', []), valid)
    if view == 'geo_velocity':
        return _build_geo_velocity(session, detection.get('velocity', []), valid)
    if view == 'dormant_acct':
        return _build_dormant(session, valid)
    if view == 'banker_collusion':
        return _build_collusion(session, valid)

    return _build_circular(session, detection.get('circular_flows', []), valid)


def summarize_available_patterns(session) -> dict:
    """Return detected patterns and representative entities for debugging / UI."""
    if not session.active or not session.detection_results:
        return {'available': False, 'patterns': {}}

    detection = session.detection_results
    valid = _valid_ids(session)
    summary = {}

    circ = detection.get('circular_flows', [])
    if circ:
        best = max(circ, key=lambda a: a.get('risk_score', 0))
        summary['circular_flow'] = {
            'entities': [n for n in best.get('cycle', []) if str(n) in valid],
            'risk_score': best.get('risk_score'),
        }

    smurf = detection.get('smurfing', [])
    if smurf:
        best = max(smurf, key=lambda a: a.get('risk_score', 0))
        src = str(best['account_id'])
        targets = sorted({
            str(t['target']) for t in session.transactions
            if str(t['source']) == src
            and LOWER_SMURF <= float(t['amount']) < THRESHOLD_SMURF
        })
        summary['smurfing'] = {
            'entities': [src] + [t for t in targets if t in valid],
            'risk_score': best.get('risk_score'),
        }

    fan = detection.get('fan_out', [])
    if fan:
        best = max(fan, key=lambda a: a.get('risk_score', 0))
        hub = str(best['account_id'])
        targets = sorted({
            str(t['target']) for t in session.transactions if str(t['source']) == hub
        })
        summary['fan_out'] = {
            'entities': [hub] + [t for t in targets if t in valid][:7],
            'risk_score': best.get('risk_score'),
        }

    vel = detection.get('velocity', [])
    if vel:
        best = max(vel, key=lambda a: a.get('risk_score', 0))
        summary['geo_velocity'] = {
            'entities': [str(n) for n in best.get('chain', []) if str(n) in valid],
            'risk_score': best.get('risk_score'),
        }
    else:
        vel_accounts = sorted([a for a in valid if 'VELO' in a])
        best_chain = []
        for starter in vel_accounts:
            candidate = _follow_transaction_chain(session, starter, valid, max_hops=5)
            if len(candidate) > len(best_chain):
                best_chain = candidate
        if best_chain:
            nodes = [str(best_chain[0]['source'])]
            for t in best_chain:
                nodes.append(str(t['target']))
            summary['geo_velocity'] = {
                'entities': nodes,
                'risk_score': None,
                'source': 'transaction_chain_fallback',
            }

    dormant_events = _build_dormant(session, valid)
    if dormant_events:
        summary['dormant_acct'] = {
            'entities': [dormant_events[0]['from_account'], dormant_events[0]['to_account']],
            'risk_score': dormant_events[0].get('risk_score'),
        }

    collusion_events = _build_collusion(session, valid)
    if collusion_events:
        ents = []
        for e in collusion_events:
            ents.extend([e['from_account'], e['to_account']])
        summary['banker_collusion'] = {
            'entities': list(dict.fromkeys(ents)),
            'risk_score': collusion_events[-1].get('risk_score'),
        }

    return {
        'available': True,
        'graph_node_count': len(valid),
        'patterns': summary,
        'best_default': _pick_best_pattern(session),
    }
