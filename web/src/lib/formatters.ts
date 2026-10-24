// ============================================================================
// BhandarSetu Operations Formatters
// Enforces integer-gram arithmetic and tabular representation
// ============================================================================

export type UnitPreference = 'kg' | 'quintal';

/**
 * Formats internal integer grams (qty_g) into user preferred display unit.
 * 1 kg = 1,000 g
 * 1 quintal = 100 kg = 100,000 g
 */
export function formatQuantity(
  qtyGrams: number | bigint,
  unit: UnitPreference = 'kg',
  includeUnit: boolean = true
): string {
  const g = typeof qtyGrams === 'bigint' ? Number(qtyGrams) : qtyGrams;

  if (unit === 'quintal') {
    const q = (g / 100000).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    });
    return includeUnit ? `${q} quintal` : q;
  }

  // Default: kg
  const kg = (g / 1000).toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });
  return includeUnit ? `${kg} kg` : kg;
}

/**
 * Formats Date to Asia/Kolkata ISO string or human-readable format.
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  formatStyle: 'full' | 'short' | 'time' = 'short'
): string {
  if (!dateInput) return 'N/A';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'Invalid Date';

  if (formatStyle === 'time') {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  if (formatStyle === 'full') {
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculates shelf life age in days relative to current date.
 */
export function calculateAgeDays(receivedDateStr: string): number {
  const recv = new Date(receivedDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - recv.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}


/**
 * Formats date and time consistently to DD-MM-YYYY hh:mm AM/PM in Asia/Kolkata (IST).
 */
export function formatDateTimeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  const f = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return f.format(d).replace(/\//g, '-');
}

/**
 * Formats date consistently to DD-MM-YYYY in Asia/Kolkata (IST).
 */
export function formatDateIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  const f = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return f.format(d).replace(/\//g, '-');
}
