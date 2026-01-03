export type ResultFlag = 'N' | 'L' | 'H' | 'C'; // Normal, Low, High, Critical

export const analyzeResult = (value: string, range: string): ResultFlag => {
  if (!range || !value) return 'N';
  
  const numVal = parseFloat(value);
  
  // If result is not a number (e.g., "Positive"), skip numeric validation
  if (isNaN(numVal)) return 'N'; 

  // Handle ranges like "10-20"
  if (range.includes('-')) {
    const [minStr, maxStr] = range.split('-').map(s => s.trim());
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    
    if (numVal < min) return 'L';
    if (numVal > max) return 'H';
    return 'N';
  }

  // Handle ranges like "< 5.0"
  if (range.includes('<')) {
    const max = parseFloat(range.replace('<', '').trim());
    return numVal >= max ? 'H' : 'N';
  }

  // Handle ranges like "> 10.0"
  if (range.includes('>')) {
    const min = parseFloat(range.replace('>', '').trim());
    return numVal <= min ? 'L' : 'N';
  }

  return 'N';
};

// Helper to color code the input box based on flag
export const getFlagColor = (flag: ResultFlag) => {
  switch (flag) {
    case 'L': return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    case 'H': return 'bg-orange-50 border-orange-500 text-orange-700';
    case 'C': return 'bg-red-100 border-red-600 text-red-800 font-bold'; // Panic!
    default: return 'bg-white border-gray-300';
  }
};