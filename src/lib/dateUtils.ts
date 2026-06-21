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

/**
 * Attempts to convert any supported input into a JS Date.
 * Returns null if conversion fails or produces an invalid date.
 */
export function toDate(value: unknown): Date | null {
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

    if (typeof value === 'object' && value !== null) {
      const timestampLike = value as { seconds?: unknown; _seconds?: unknown };
      const seconds = timestampLike.seconds ?? timestampLike._seconds;
      if (typeof seconds === 'number') {
        const d = new Date(seconds * 1000);
        return isNaN(d.getTime()) ? null : d;
      }
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

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function getDateTimeMillis(value: unknown): number {
  return toDate(value)?.getTime() ?? 0;
}

/**
 * Formats a timestamp as a full Indonesian date + time.
 * Output: "20/06/2026, 19:23"
 */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Formats a timestamp as a date only.
 * Output: "20/06/2026"
 */
export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Formats a timestamp as a time only (24-hour, no AM/PM).
 * Output: "19:23"
 */
export function formatTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return FALLBACK;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
