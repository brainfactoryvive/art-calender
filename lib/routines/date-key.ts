/** Local calendar date key YYYY-MM-DD (timezone-safe for day cells). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function logKey(routineId: string, dateKey: string): string {
  return `${routineId}:${dateKey}`;
}
