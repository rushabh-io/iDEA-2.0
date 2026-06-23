from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import math
import uuid
from core.database import db
from analysis.session import get_session

router = APIRouter()

DETECTION_TITLE_MARKER = " Detection — "
AUTO_ASSIGNEES = frozenset({'System Detection', 'Simulation Engine'})
ACTIVE_STATUSES = frozenset({'OPEN', 'INVESTIGATING'})


class CaseCreate(BaseModel):
    account_id: str
    title: str
    priority: str
    assigned_to: str
    notes: Optional[str] = ""
    pattern_type: Optional[str] = None


class CaseUpdate(BaseModel):
    status: str
    notes: Optional[str] = ""


def _format_indian_commas(n: int) -> str:
    s = str(int(n))
    if len(s) <= 3:
        return s
    last_three = s[-3:]
    remaining = s[:-3]
    groups: List[str] = []
    while remaining:
        if len(remaining) <= 2:
            groups.insert(0, remaining)
            remaining = ''
        else:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
    return f"{','.join(groups)},{last_three}"


def format_inr_amount(amount: float) -> str:
    """Unified Indian currency formatter matching frontend formatCurrency."""
    val = float(amount or 0)
    negative = val < 0
    abs_val = abs(val)

    if abs_val >= 10_000_000:
        formatted = f"{math.floor(abs_val / 100_000) / 100:.2f}Cr"
    elif abs_val >= 100_000:
        formatted = f"{math.floor(abs_val / 1_000) / 100:.2f}L"
    else:
        formatted = _format_indian_commas(abs_val)

    prefix = '-Rs ' if negative else 'Rs '
    return f"{prefix}{formatted}"


def _normalize_pattern_key(pattern_key: str) -> str:
    pk = str(pattern_key or 'anomaly').lower()
    if 'circular' in pk or 'cycle' in pk:
        return 'circular_flow'
    if 'smurf' in pk:
        return 'smurfing'
    if 'fan_out' in pk or 'fanout' in pk:
        return 'fan_out'
    if 'fan_in' in pk or 'fanin' in pk:
        return 'fan_in'
    if 'velocity' in pk or 'geo' in pk:
        return 'geo_velocity'
    if 'dormant' in pk:
        return 'dormant_acct'
    if 'collusion' in pk:
        return 'banker_collusion'
    if 'anomaly' in pk:
        return 'anomaly'
    return pk


def pattern_display_name(pattern_key: str) -> str:
    pk = _normalize_pattern_key(pattern_key)
    names = {
        'circular_flow': 'Circular Flow',
        'smurfing': 'Smurfing',
        'fan_out': 'Fan-Out',
        'fan_in': 'Fan-In',
        'geo_velocity': 'Geo-Velocity',
        'dormant_acct': 'Dormant Account',
        'banker_collusion': 'Banker Collusion',
        'bipartite': 'Bipartite',
        'anomaly': 'Anomaly',
    }
    return names.get(pk, 'Anomaly')


def generate_auto_title(pattern_key: str, account_id: str, amount: float) -> str:
    pattern_name = pattern_display_name(pattern_key)
    amt_str = format_inr_amount(amount)
    return f"{pattern_name} Detection — {account_id} — {amt_str}"


def _join_account_list(accounts: List[str]) -> str:
    if not accounts:
        return ''
    if len(accounts) == 1:
        return accounts[0]
    if len(accounts) == 2:
        return f"{accounts[0]} and {accounts[1]}"
    return f"{', '.join(accounts[:-1])} and {accounts[-1]}"


def _smurf_destination(session, source_id: str) -> Optional[str]:
    targets: Dict[str, int] = {}
    for txn in session.transactions:
        if str(txn['source']) != source_id:
            continue
        amt = float(txn['amount'])
        if 8500 <= amt < 10000:
            tgt = str(txn['target'])
            targets[tgt] = targets.get(tgt, 0) + 1
    if not targets:
        return None
    return max(targets, key=targets.get)


def generate_case_description(alert: Dict) -> str:
    ptype = _normalize_pattern_key(alert.get('type') or 'anomaly')
    acc_id = str(_alert_account_id(alert) or alert.get('account_id') or 'Unknown')
    session = get_session()

    if ptype == 'smurfing':
        count = alert.get('transaction_count') or len(alert.get('amounts') or [])
        dest = alert.get('primary_dest')
        if not dest and session.active:
            dest = _smurf_destination(session, acc_id)
        dest = dest or 'multiple accounts'
        return (
            f"{count} structured transactions below reporting threshold "
            f"detected from {acc_id} to {dest}."
        )

    if ptype == 'circular_flow':
        cycle = [str(n) for n in (alert.get('cycle') or [])]
        if len(cycle) >= 2:
            return (
                f"{len(cycle)}-node circular transaction loop detected "
                f"involving {_join_account_list(cycle)}."
            )

    if ptype == 'fan_out':
        count = alert.get('target_count', 0)
        return (
            f"{acc_id} dispersed funds to {count} destination accounts "
            f"within a short time window."
        )

    if ptype == 'fan_in':
        count = alert.get('source_count', 0)
        return (
            f"{acc_id} received funds from {count} source accounts "
            f"within a short time window."
        )

    if ptype == 'anomaly':
        z = alert.get('z_score', 0)
        return f"Transaction amount is {float(z):.1f} standard deviations above network average."

    if ptype == 'geo_velocity':
        hops = alert.get('hops') or (len(alert.get('chain') or []) - 1)
        days = alert.get('days_span', 0)
        return (
            f"{acc_id} moved funds through {hops} accounts in {days} days, "
            f"indicating rapid layering."
        )

    custom = alert.get('description')
    if custom:
        return str(custom)

    return f"{pattern_display_name(ptype)} pattern detected for account {acc_id}."


def _ensure_session_cases(session) -> None:
    if not hasattr(session, 'cases') or session.cases is None:
        session.cases = []


def _is_detection_title(title: str) -> bool:
    return DETECTION_TITLE_MARKER in (title or '')


def _case_dedup_key(pattern_type: str, account_id: str) -> str:
    return f"{_normalize_pattern_key(pattern_type)}|{str(account_id)}"


def _alert_account_id(alert: Dict) -> Optional[str]:
    acc_id = alert.get('account_id')
    if acc_id:
        return str(acc_id)
    cycle = alert.get('cycle')
    if cycle:
        return str(cycle[0])
    return None


def _alert_amount(alert: Dict, acc_id: str) -> float:
    amount = (
        alert.get('total_amount')
        or alert.get('total_received')
        or alert.get('total_value')
        or alert.get('amount')
        or 0.0
    )
    if not amount and alert.get('amounts'):
        amount = max(alert['amounts'])

    session = get_session()
    if not amount:
        if session.active:
            for txn in session.transactions:
                if str(txn['source']) == acc_id or str(txn['target']) == acc_id:
                    amount = max(amount, float(txn['amount']))
        else:
            q_tx = (
                "MATCH (a:Account {id: $acc_id})-[t:TRANSACTION]-() "
                "RETURN max(t.amount) as max_amount"
            )
            res_tx = db.query(q_tx, acc_id=acc_id)
            if res_tx and res_tx[0].get('max_amount') is not None:
                amount = float(res_tx[0]['max_amount'])

    return float(amount) if amount else 100000.0


def _infer_pattern_key(account_id: str) -> str:
    session = get_session()
    acc_id = str(account_id)

    if session.active and session.detection_results:
        best_score = -1
        best_type = 'anomaly'
        for alert in session.detection_results.get('all_alerts', []):
            if str(_alert_account_id(alert)) == acc_id:
                score = alert.get('risk_score', 0)
                if score > best_score:
                    best_score = score
                    best_type = alert.get('type') or 'anomaly'
        if best_score >= 0:
            return best_type

        acc = next((a for a in session.accounts if str(a['id']) == acc_id), None)
        if acc:
            if acc.get('fan_out_flag'):
                return 'fan_out'
            if acc.get('fan_in_flag'):
                return 'fan_in'
            if acc.get('gather_scatter_flag'):
                return 'gather_scatter'
            if acc.get('scatter_gather_flag'):
                return 'scatter_gather'
            if acc.get('velocity_flag'):
                return 'velocity'
            flag = str(acc.get('flag', '')).lower()
            if flag:
                return flag

    res = db.query(
        """
        MATCH (a:Account {id: $acc_id})
        RETURN a.fan_out_flag as fan_out_flag, a.fan_in_flag as fan_in_flag,
               a.gather_scatter_flag as gather_scatter_flag,
               a.scatter_gather_flag as scatter_gather_flag,
               a.velocity_flag as velocity_flag, a.flag as flag
        """,
        acc_id=acc_id,
    )
    if res:
        row = res[0]
        if row.get('fan_out_flag'):
            return 'fan_out'
        if row.get('fan_in_flag'):
            return 'fan_in'
        if row.get('gather_scatter_flag'):
            return 'gather_scatter'
        if row.get('scatter_gather_flag'):
            return 'scatter_gather'
        if row.get('velocity_flag'):
            return 'velocity'
        if row.get('flag'):
            return str(row['flag']).lower()

    return 'anomaly'


def _resolve_case_title(raw_title: str, pattern_key: str, account_id: str, amount: float) -> str:
    title = (raw_title or '').strip()
    if (
        not title
        or title.startswith("Suspected ")
        or title.startswith("Anomaly Investigation")
        or not _is_detection_title(title)
    ):
        return generate_auto_title(pattern_key, account_id, amount)
    return title


def _case_source(assigned_to: str) -> str:
    if assigned_to == 'Simulation Engine':
        return 'simulation'
    if assigned_to == 'System Detection':
        return 'detection'
    return 'manual'


def _append_notes(existing: str, new: str) -> str:
    new = (new or '').strip()
    if not new:
        return existing or ''
    if not existing:
        return new
    if new in existing:
        return existing
    return f"{existing.rstrip()}\n\n{new}"


def _find_active_case(session, pattern_type: str, account_id: str) -> Optional[Dict]:
    norm = _normalize_pattern_key(pattern_type)
    for case in session.cases:
        if case.get('status') not in ACTIVE_STATUSES:
            continue
        stored = case.get('pattern_type') or _normalize_pattern_key(_infer_pattern_key(case.get('account_id', '')))
        if stored == norm and str(case.get('account_id')) == str(account_id):
            return case
    return None


def clear_auto_generated_cases() -> None:
    session = get_session()
    _ensure_session_cases(session)

    if session.active:
        session.cases = [c for c in session.cases if c.get('source') == 'manual']
        return

    db.query(
        """
        MATCH (c:Case)
        WHERE c.assigned_to IN $assignees OR c.source IN ['detection', 'simulation']
        DETACH DELETE c
        """,
        assignees=list(AUTO_ASSIGNEES),
    )
    db.query(
        """
        MATCH (c:Case)
        WHERE NOT c.title CONTAINS $marker
        DETACH DELETE c
        """,
        marker=DETECTION_TITLE_MARKER,
    )


def upsert_case_internal(
    account_id: str,
    title: str,
    priority: str,
    assigned_to: str,
    notes: str,
    pattern_type: str,
    source: Optional[str] = None,
    alert: Optional[Dict] = None,
) -> str:
    session = get_session()
    _ensure_session_cases(session)
    case_source = source or _case_source(assigned_to)
    norm_pattern = _normalize_pattern_key(pattern_type)
    description = generate_case_description(alert) if alert else notes
    now = datetime.now().isoformat()

    if session.active:
        existing = _find_active_case(session, norm_pattern, account_id)
        if existing:
            existing['title'] = title
            existing['priority'] = priority
            existing['updated_at'] = now
            existing['pattern_type'] = norm_pattern
            existing['notes'] = _append_notes(existing.get('notes', ''), description or notes)
            return existing['id']

        case_id = "CASE_" + uuid.uuid4().hex[:8].upper()
        session.cases.append({
            'id': case_id,
            'title': title,
            'status': 'OPEN',
            'priority': priority,
            'assigned_to': assigned_to,
            'notes': description or notes,
            'created_at': now,
            'updated_at': now,
            'account_id': account_id,
            'source': case_source,
            'pattern_type': norm_pattern,
        })
        return case_id

    find_query = """
    MATCH (c:Case)-[:INVESTIGATES]->(a:Account {id: $account_id})
    WHERE c.status IN ['OPEN', 'INVESTIGATING'] AND c.pattern_type = $pattern_type
    RETURN c.id as id, c.notes as notes
    """
    existing_rows = db.query(
        find_query,
        account_id=account_id,
        pattern_type=norm_pattern,
    )

    if existing_rows:
        case_id = existing_rows[0]['id']
        merged_notes = _append_notes(existing_rows[0].get('notes', ''), description or notes)
        db.query(
            """
            MATCH (c:Case {id: $case_id})
            SET c.title = $title,
                c.priority = $priority,
                c.notes = $notes,
                c.updated_at = $now
            RETURN c
            """,
            case_id=case_id,
            title=title,
            priority=priority,
            notes=merged_notes,
            now=now,
        )
        return case_id

    case_id = "CASE_" + uuid.uuid4().hex[:8].upper()
    db.query(
        """
        MATCH (a:Account {id: $account_id})
        CREATE (c:Case {
            id: $case_id,
            title: $title,
            status: 'OPEN',
            priority: $priority,
            assigned_to: $assigned_to,
            notes: $notes,
            source: $source,
            pattern_type: $pattern_type,
            created_at: $now,
            updated_at: $now
        })
        CREATE (c)-[:INVESTIGATES]->(a)
        RETURN c
        """,
        account_id=account_id,
        case_id=case_id,
        title=title,
        priority=priority,
        assigned_to=assigned_to,
        notes=description or notes,
        source=case_source,
        pattern_type=norm_pattern,
        now=now,
    )
    return case_id


def add_case_internal(
    account_id: str,
    title: str,
    priority: str,
    assigned_to: str,
    notes: str,
    source: Optional[str] = None,
    pattern_type: Optional[str] = None,
) -> str:
    """Create a manual case — always inserts, no deduplication."""
    session = get_session()
    _ensure_session_cases(session)
    case_id = "CASE_" + uuid.uuid4().hex[:8].upper()
    now = datetime.now().isoformat()
    case_source = source or _case_source(assigned_to)
    norm_pattern = _normalize_pattern_key(pattern_type or _infer_pattern_key(account_id))

    if session.active:
        session.cases.append({
            'id': case_id,
            'title': title,
            'status': 'OPEN',
            'priority': priority,
            'assigned_to': assigned_to,
            'notes': notes,
            'created_at': now,
            'updated_at': now,
            'account_id': account_id,
            'source': case_source,
            'pattern_type': norm_pattern,
        })
    else:
        db.query(
            """
            MATCH (a:Account {id: $account_id})
            CREATE (c:Case {
                id: $case_id,
                title: $title,
                status: 'OPEN',
                priority: $priority,
                assigned_to: $assigned_to,
                notes: $notes,
                source: $source,
                pattern_type: $pattern_type,
                created_at: $now,
                updated_at: $now
            })
            CREATE (c)-[:INVESTIGATES]->(a)
            RETURN c
            """,
            account_id=account_id,
            case_id=case_id,
            title=title,
            priority=priority,
            assigned_to=assigned_to,
            notes=notes,
            source=case_source,
            pattern_type=norm_pattern,
            now=now,
        )
    return case_id


def _sort_cases(cases: List[Dict]) -> List[Dict]:
    priority_map = {'High': 1, 'Medium': 2, 'Low': 3}
    return sorted(
        cases,
        key=lambda c: (priority_map.get(c.get('priority', 'Medium'), 2), c.get('created_at', '')),
        reverse=False,
    )


def _sync_cases_from_session_detections() -> None:
    session = get_session()
    _ensure_session_cases(session)
    if not session.active or not session.detection_results:
        return
    alerts = session.detection_results.get('all_alerts', [])
    if alerts:
        create_cases_from_detection_alerts(alerts, replace=False)


@router.post("")
def create_case(case: CaseCreate):
    session = get_session()
    pattern_key = case.pattern_type or _infer_pattern_key(case.account_id)
    amount = _alert_amount({}, case.account_id)
    clean_title = _resolve_case_title(case.title, pattern_key, case.account_id, amount)
    case_source = 'manual' if case.assigned_to not in AUTO_ASSIGNEES else _case_source(case.assigned_to)

    if case.assigned_to in AUTO_ASSIGNEES:
        case_id = upsert_case_internal(
            account_id=case.account_id,
            title=clean_title,
            priority=case.priority,
            assigned_to=case.assigned_to,
            notes=case.notes,
            pattern_type=pattern_key,
            source=case_source,
        )
    else:
        case_id = add_case_internal(
            account_id=case.account_id,
            title=clean_title,
            priority=case.priority,
            assigned_to=case.assigned_to,
            notes=case.notes,
            source=case_source,
            pattern_type=pattern_key,
        )
    return {"case_id": case_id, "status": "OPEN", "title": clean_title}


@router.get("")
def get_cases():
    session = get_session()
    if session.active:
        _ensure_session_cases(session)
        _sync_cases_from_session_detections()
        return _sort_cases(session.cases)

    query = """
    MATCH (c:Case)-[:INVESTIGATES]->(a:Account)
    WHERE c.title CONTAINS $marker
    RETURN c.id as id, c.title as title, c.status as status, c.priority as priority,
           c.assigned_to as assigned_to, c.notes as notes, c.created_at as created_at,
           c.updated_at as updated_at, a.id as account_id, c.source as source,
           c.pattern_type as pattern_type
    ORDER BY
        CASE c.priority
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 3
            ELSE 4 END,
        c.created_at DESC
    """
    return db.query(query, marker=DETECTION_TITLE_MARKER)


@router.patch("/{case_id}")
def update_case(case_id: str, case_update: CaseUpdate):
    session = get_session()
    if session.active:
        _ensure_session_cases(session)
        now = datetime.now().isoformat()
        for c in session.cases:
            if c['id'] == case_id:
                c['status'] = case_update.status
                c['notes'] = case_update.notes
                c['updated_at'] = now
                return {"status": "success", "case": c}
        raise HTTPException(status_code=404, detail="Case not found")

    now = datetime.now().isoformat()
    query = """
    MATCH (c:Case {id: $case_id})
    SET c.status = $status,
        c.notes = $notes,
        c.updated_at = $now
    RETURN c
    """
    res = db.query(
        case_id=case_id,
        status=case_update.status,
        notes=case_update.notes,
        now=now,
    )

    if not res:
        raise HTTPException(status_code=404, detail="Case not found")

    return {"status": "success", "case": dict(res[0]['c'])}


@router.get("/stats")
def get_case_stats():
    session = get_session()
    stats = {"OPEN": 0, "INVESTIGATING": 0, "CLOSED": 0, "ESCALATED": 0}

    if session.active:
        _ensure_session_cases(session)
        for c in session.cases:
            status = c.get('status')
            if status in stats:
                stats[status] += 1
        return stats

    query = """
    MATCH (c:Case)
    WHERE c.title CONTAINS $marker
    RETURN c.status as status, count(c) as count
    """
    results = db.query(query, marker=DETECTION_TITLE_MARKER)

    for row in results:
        status = row['status']
        if status in stats:
            stats[status] = row['count']

    return stats


def create_cases_from_detection_alerts(alerts: List[Dict], replace: bool = False) -> int:
    session = get_session()
    _ensure_session_cases(session)

    if replace:
        clear_auto_generated_cases()

    if not alerts:
        return 0

    best_by_key: Dict[str, Dict] = {}
    for alert in alerts:
        acc_id = _alert_account_id(alert)
        if not acc_id:
            continue
        key = _case_dedup_key(alert.get('type') or 'anomaly', acc_id)
        prev = best_by_key.get(key)
        if not prev or alert.get('risk_score', 0) > prev.get('risk_score', 0):
            best_by_key[key] = alert

    created_count = 0
    for alert in sorted(
        best_by_key.values(),
        key=lambda x: x.get('risk_score', 0),
        reverse=True,
    ):
        acc_id = _alert_account_id(alert)
        if not acc_id:
            continue

        risk = alert.get('risk_score', 50)
        priority = 'High' if risk >= 80 else 'Medium' if risk >= 50 else 'Low'
        amount = _alert_amount(alert, acc_id)
        pattern_key = alert.get('type') or 'anomaly'
        title = generate_auto_title(pattern_key, acc_id, amount)
        description = generate_case_description(alert)

        upsert_case_internal(
            account_id=acc_id,
            title=title,
            priority=priority,
            assigned_to='System Detection',
            notes=description,
            pattern_type=pattern_key,
            source='detection',
            alert=alert,
        )
        created_count += 1

    return created_count
