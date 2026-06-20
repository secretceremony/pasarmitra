/**
 * dateUtils.ts — Centralized date/time formatting for PasarMitra
 *
 * Accepted input types for all functions:
 *   - Firestore Timestamp  (object with a `.toDate()` method)
 *   - JavaScript Date
 *   - ISO 8601 string      (e.g. "2026-06-20T19:23:00.000Z")
 *   - Unix timestamp in ms (number)
 *   - null | undefined
 *   - empty string
 *   - any other value      → returns FALLBACK
 *
 * All functions are pure and never throw.
 * Invalid or unresolvable values return FALLBACK ("Tidak tersedia").
 *
 * Display formats (Indonesian 24-hour clock, no AM/PM):
 *   formatDateTime → "20/06/2026, 19:23"
 *   formatDate     → "20/06/2026"
 *   formatTime     → "19:23"
 */

const FALLBACK = 'Tidak tersedia';

/** Locale used for all formatting. */
const LOCALE = 'id-ID';

/**
 * Attempts to convert any supported input into a JS Date.
 * Returns null if conversion fails or produces an invalid date.
 */
function toDate(value: unknown): Date | null {
  try {
    if (value == null || value === '') return null;

    // Firestore Timestamp — has a toDate() method
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      const d = (value as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    }

    // Already a JS Date
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    // Number (unix ms) or parseable string
    if (typeof value === 'number' || typeof value === 'string') {
      const d = new Date(value as string | number);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Formats a timestamp as a full Indonesian date + time.
 * Output: "20/06/2026, 19:23"
 */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Formats a timestamp as a date only.
 * Output: "20/06/2026"
 */
export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a timestamp as a time only (24-hour, no AM/PM).
 * Output: "19:23"
 */
export function formatTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
