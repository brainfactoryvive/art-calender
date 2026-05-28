export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
}

export function defaultEndFromStart(start: Date): Date {
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return end;
}

export function localDatetimeToISO(value: string): string {
  return new Date(value).toISOString();
}

export function buildDefaultFormTimes(clickedDate: Date): {
  start: string;
  end: string;
} {
  const start = startOfDay(clickedDate);
  const end = defaultEndFromStart(start);
  return {
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(end),
  };
}
