/**
 * Days an invoice is past its due date, measured today.
 * Parses YYYY-MM-DD as a local date so day counts are timezone stable.
 */
export function daysPastDue(invoiceDueDate: string, today: Date): number {
  const due = new Date(`${invoiceDueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Rough film-meter requirement for a cover run. Kept in one place so the
 * coverage check shown to the publisher and the meter deducted from stock
 * always agree.
 */
export function estimateFilmMeters(coversCount: number): number {
  return Math.round(coversCount * 0.7);
}

/**
 * Today's date as a local YYYY-MM-DD string (Bangladesh, UTC+6), matching the
 * format used by <input type="date"> so comparisons are timezone stable.
 */
export function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Convert a stored ISO date (YYYY-MM-DD or full timestamp) into the
 * Bangladesh-friendly DD-MM-YYYY display format.
 */
export function formatDateBn(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3 || parts.some((p) => !p)) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Format a Date as a 12-hour "hh:mm AM/PM" time (no leading zero on the hour),
 * the convention used everywhere in the Bangladesh-facing UI.
 */
export function formatTimeBn(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * Convert a stored ISO timestamp into "DD-MM-YYYY, hh:mm AM/PM" in the user's
 * local timezone. Falls back to DD-MM-YYYY for date-only values.
 */
export function formatDateTimeBn(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDateBn(iso);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `${formatDateBn(localDate)}, ${formatTimeBn(date)}`;
}