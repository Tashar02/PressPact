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