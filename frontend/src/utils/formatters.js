/** Indian-style grouping: 95000 -> "95,000", 1234567 -> "12,34,567" */
export function formatIndianCommas(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  const str = String(n);
  if (str.length <= 3) return str;
  const lastThree = str.slice(-3);
  let remaining = str.slice(0, -3);
  const groups = [];
  while (remaining.length > 0) {
    if (remaining.length <= 2) {
      groups.unshift(remaining);
      remaining = '';
    } else {
      groups.unshift(remaining.slice(-2));
      remaining = remaining.slice(0, -2);
    }
  }
  return `${groups.join(',')},${lastThree}`;
}

/**
 * Unified Indian currency formatter.
 * < 1,00,000  => Rs 95,000
 * 1L - 99L    => Rs 4.70L
 * 1Cr+        => Rs 1.80Cr
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'Rs 0';

  const numeric = Number(amount);
  const negative = numeric < 0;
  const absAmount = Math.abs(numeric);
  let formatted;

  if (absAmount >= 10000000) {
    formatted = `${(Math.floor(absAmount / 100000) / 100).toFixed(2)}Cr`;
  } else if (absAmount >= 100000) {
    formatted = `${(Math.floor(absAmount / 1000) / 100).toFixed(2)}L`;
  } else {
    formatted = formatIndianCommas(absAmount);
  }

  return negative ? `-Rs ${formatted}` : `Rs ${formatted}`;
};

/** Alias used by case title helpers — same rules as formatCurrency */
export const formatCaseAmount = formatCurrency;

export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

export const formatId = (id) => {
  if (!id) return '';
  const str = String(id);
  return (str.length > 8 ? str.substring(0, 8) : str).toUpperCase();
};

export const formatPercent = (n) => {
  if (n === undefined || n === null) return '0%';
  return `${Number(n).toFixed(1)}%`;
};
