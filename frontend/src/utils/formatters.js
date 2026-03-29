export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

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
