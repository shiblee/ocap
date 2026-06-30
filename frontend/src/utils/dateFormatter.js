/**
 * Safely parses a backend date string and formats it to IST (Asia/Kolkata).
 * It automatically appends 'Z' if the backend returns a naive UTC datetime string
 * (which lacks 'Z' or timezone offset) so that JS parses it as UTC.
 */
export const formatDateTimeIST = (dateString) => {
  if (!dateString) return '-';
  
  // If dateString doesn't have 'Z' or timezone offset, append 'Z' (assuming backend sends UTC)
  let parsedDateStr = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    parsedDateStr += 'Z';
  }
  
  const date = new Date(parsedDateStr);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDateIST = (dateString) => {
  if (!dateString) return '-';
  
  let parsedDateStr = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    parsedDateStr += 'Z';
  }
  
  const date = new Date(parsedDateStr);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Returns a date string formatted for datetime-local inputs
 * which require format: YYYY-MM-DDThh:mm
 * It converts the UTC backend time to IST before slicing.
 */
export const formatForDateTimeInput = (dateString) => {
    if (!dateString) return '';
    let parsedDateStr = dateString;
    if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
      parsedDateStr += 'Z';
    }
    const date = new Date(parsedDateStr);
    if (isNaN(date.getTime())) return '';
    
    const istOffsetMs = 330 * 60000; // +05:30
    const istDate = new Date(date.getTime() + istOffsetMs);
    return istDate.toISOString().slice(0, 16);
};

/**
 * Converts a datetime-local input string (assumed to be IST)
 * into a UTC ISO string for sending to backend.
 */
export const parseFromDateTimeInput = (localDateString) => {
    if (!localDateString) return null;
    // Append IST timezone offset so it parses correctly
    const date = new Date(localDateString + '+05:30');
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
};
