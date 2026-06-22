export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'Rs 0';
  
  // Format as Indian Rupees with proper notation
  const absAmount = Math.abs(amount);
  let formatted;
  
  if (absAmount >= 10000000) {
    // >= 1 Crore, show in Cr
    formatted = (absAmount / 10000000).toFixed(2) + 'Cr';
  } else if (absAmount >= 100000) {
    // >= 1 Lakh, show in L
    formatted = (absAmount / 100000).toFixed(2) + 'L';
  } else if (absAmount >= 1000) {
    // Format with commas in Indian style (e.g., 12,34,567)
    const numStr = Math.floor(absAmount).toString();
    let formatted_num = '';
    for (let i = numStr.length - 1, count = 0; i >= 0; i--, count++) {
      if (count > 0 && count % 2 === 0 && count !== numStr.length) {
        formatted_num = ',' + formatted_num;
      }
      formatted_num = numStr[i] + formatted_num;
    }
    formatted = formatted_num;
  } else {
    formatted = Math.floor(absAmount).toString();
  }
  
  return amount < 0 ? `-Rs ${formatted}` : `Rs ${formatted}`;
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
