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