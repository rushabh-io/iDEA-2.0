import { patternNameFromKey } from './caseTitles';

function joinAccountList(accounts) {
  if (!accounts?.length) return '';
  if (accounts.length === 1) return accounts[0];
  if (accounts.length === 2) return `${accounts[0]} and ${accounts[1]}`;
  return `${accounts.slice(0, -1).join(', ')} and ${accounts[accounts.length - 1]}`;
}

export function descriptionFromAlert(alert) {
  if (!alert) return '';
  const ptype = String(alert.type || 'anomaly').toLowerCase();
  const accId = String(alert.account_id || '');

  if (ptype.includes('smurf')) {
    const count = alert.transaction_count || alert.amounts?.length || 0;
    const dest = alert.primary_dest || alert.destination || 'multiple accounts';
    return `${count} structured transactions below reporting threshold detected from ${accId} to ${dest}.`;
  }

  if (ptype.includes('circular') || ptype.includes('cycle')) {
    const cycle = (alert.cycle || []).map(String);
    if (cycle.length >= 2) {
      return `${cycle.length}-node circular transaction loop detected involving ${joinAccountList(cycle)}.`;
    }
  }

  if (ptype.includes('fan_out') || ptype.includes('fanout')) {
    const count = alert.target_count || 0;
    return `${accId} dispersed funds to ${count} destination accounts within a short time window.`;
  }

  if (ptype.includes('fan_in') || ptype.includes('fanin')) {
    const count = alert.source_count || 0;
    return `${accId} received funds from ${count} source accounts within a short time window.`;
  }

  if (ptype.includes('anomaly')) {
    const z = alert.z_score ?? 0;
    return `Transaction amount is ${Number(z).toFixed(1)} standard deviations above network average.`;
  }

  if (ptype.includes('velocity') || ptype.includes('geo')) {
    const hops = alert.hops || (alert.chain?.length ? alert.chain.length - 1 : 0);
    const days = alert.days_span ?? 0;
    return `${accId} moved funds through ${hops} accounts in ${days} days, indicating rapid layering.`;
  }

  if (alert.description) return alert.description;

  const patternName = patternNameFromKey(ptype);
  return `${patternName} pattern detected for account ${accId}.`;
}

export function descriptionFromSimulation(pattern, events, primaryAccount) {
  const txns = events.filter((e) => e.type === 'transaction');
  const ptype = String(pattern || 'circular_flow').toLowerCase();
  const accId = primaryAccount || txns[0]?.from_account || 'Unknown';

  if (ptype.includes('smurf')) {
    const dest = txns[0]?.to_account || 'multiple accounts';
    return `${txns.length} structured transactions below reporting threshold detected from ${accId} to ${dest}.`;
  }

  if (ptype.includes('circular') || ptype.includes('cycle')) {
    const nodes = [];
    txns.forEach((t) => {
      if (t.from_account && !nodes.includes(t.from_account)) nodes.push(t.from_account);
    });
    if (txns.length && txns[txns.length - 1]?.to_account) {
      const last = txns[txns.length - 1].to_account;
      if (!nodes.includes(last)) nodes.push(last);
    }
    if (nodes.length >= 2) {
      return `${nodes.length}-node circular transaction loop detected involving ${joinAccountList(nodes)}.`;
    }
  }

  if (ptype.includes('fan_out') || ptype.includes('fanout')) {
    const targets = new Set(txns.map((t) => t.to_account).filter(Boolean));
    return `${accId} dispersed funds to ${targets.size} destination accounts within a short time window.`;
  }

  if (ptype.includes('anomaly')) {
    return 'Transaction amount is significantly above network average.';
  }

  const patternName = patternNameFromKey(ptype);
  return `${patternName} pattern detected during live simulation for account ${accId}.`;
}
