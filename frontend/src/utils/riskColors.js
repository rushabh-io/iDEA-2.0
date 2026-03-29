export const getRiskColor = (score) => {
  const numScore = Number(score) || 0;
  
  if (numScore > 80) {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }; // Critical (Red)
  }
  if (numScore >= 60) {
    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }; // High (Orange)
  }
  if (numScore >= 30) {
    return { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' }; // Medium (Yellow)
  }
  return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };   // Low (Green)
};

export const getRiskLabel = (score) => {
  const numScore = Number(score) || 0;
  
  if (numScore > 80) return 'Critical';
  if (numScore >= 60) return 'High';
  if (numScore >= 30) return 'Medium';
  return 'Low';
};

export const getRiskPillClass = (score) => {
  const numScore = Number(score) || 0;
  
  if (numScore > 80) return 'bg-red-50 text-red-600 border-red-200';
  if (numScore >= 60) return 'bg-amber-50 text-amber-600 border-amber-200';
  if (numScore >= 30) return 'bg-yellow-50 text-yellow-600 border-yellow-200';
  return 'bg-green-50 text-green-600 border-green-200';
};
