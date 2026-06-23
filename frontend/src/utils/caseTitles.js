import { formatCaseAmount } from './formatters';

/**
 * Match backend generate_auto_title in routers/cases.py
 */
export function patternNameFromKey(patternKey) {
  const pk = String(patternKey || 'anomaly').toLowerCase();
  if (pk.includes('circular') || pk.includes('cycle')) return 'Circular Flow';
  if (pk.includes('smurf')) return 'Smurfing';
  if (pk.includes('fan_out') || pk.includes('fanout')) return 'Fan-Out';
  if (pk.includes('fan_in') || pk.includes('fanin')) return 'Fan-In';
  if (pk.includes('gather_scatter') || pk.includes('gather-scatter')) return 'Gather-Scatter';
  if (pk.includes('scatter_gather') || pk.includes('scatter-gather')) return 'Scatter-Gather';
  if (pk.includes('velocity') || pk.includes('geo')) return 'Geo-Velocity';
  if (pk.includes('dormant')) return 'Dormant Account';
  if (pk.includes('collusion')) return 'Banker Collusion';
  if (pk.includes('bipartite')) return 'Bipartite';
  if (pk.includes('stack')) return 'Stack';
  if (pk.includes('layer')) return 'Layering';
  if (pk.includes('pep')) return 'PEP Network';
  if (pk.includes('codirector') || pk.includes('co_director')) return 'Co-Director';
  if (pk.includes('fatf')) return 'FATF Risk';
  if (pk.includes('rapid')) return 'Rapid Layering';
  return 'Anomaly';
}

export function generateCaseTitle(patternKey, accountId, amount = 0) {
  const patternName = patternNameFromKey(patternKey);
  const amt = amount > 0 ? amount : 100000;
  return `${patternName} Detection — ${accountId} — ${formatCaseAmount(amt)}`;
}

export function inferPatternKey(entity) {
  if (!entity) return 'anomaly';

  const flag = String(entity.flag || '').toLowerCase();
  if (flag) return flag;

  const patterns = entity.patterns || [];
  if (patterns.length > 0) {
    const p = String(patterns[0]).toLowerCase();
    if (p.includes('cycle')) return 'circular_flow';
    if (p.includes('smurf')) return 'smurfing';
    if (p.includes('fan-out') || p.includes('fan_out')) return 'fan_out';
    if (p.includes('fan-in') || p.includes('fan_in')) return 'fan_in';
    if (p.includes('bipartite')) return 'bipartite';
    if (p.includes('stack')) return 'stack';
    return p.replace(/-/g, '_');
  }

  if (entity.fan_out_flag) return 'fan_out';
  if (entity.fan_in_flag) return 'fan_in';
  if (entity.gather_scatter_flag) return 'gather_scatter';
  if (entity.scatter_gather_flag) return 'scatter_gather';
  if (entity.velocity_flag) return 'velocity';
  if (entity.codirector_flag) return 'codirector';

  return 'anomaly';
}

export function alertForEntity(alerts, entityId) {
  if (!alerts?.length || !entityId) return null;
  const id = String(entityId);
  return alerts.find((alert) => {
    if (String(alert.account_id) === id) return true;
    if (Array.isArray(alert.cycle) && alert.cycle.some((n) => String(n) === id)) return true;
    return false;
  }) || null;
}

export function amountFromAlert(alert) {
  if (!alert) return 0;
  return (
    alert.total_amount
    || alert.total_received
    || alert.total_value
    || alert.amount
    || (Array.isArray(alert.amounts) ? Math.max(...alert.amounts) : 0)
    || 0
  );
}

export function buildCaseTitleForEntity(entity, alerts = []) {
  const alert = alertForEntity(alerts, entity.id);
  const patternKey = alert?.type || inferPatternKey(entity);
  const amount = amountFromAlert(alert);
  return generateCaseTitle(patternKey, entity.id, amount);
}
