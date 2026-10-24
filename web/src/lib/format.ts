import { DEMO_TODAY } from '../data/seedData';

/**
 * Parses date string in "DD-MM-YYYY" or ISO format into a Date object
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        // DD-MM-YYYY
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        return new Date(year, month, day);
      }
    }
  }
  return new Date(dateStr);
}

/**
 * Calculates age in days relative to DEMO_TODAY (2025-10-23)
 */
export function calculateAgeDays(arrivalDateStr: string, referenceDateStr: string = DEMO_TODAY): number {
  const arrival = parseDate(arrivalDateStr);
  const ref = parseDate(referenceDateStr);
  const diffTime = ref.getTime() - arrival.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Formats a number with Indian / International thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

/**
 * Formats bags display
 */
export function formatBags(count: number): string {
  return `${formatNumber(count)} Bags`;
}

