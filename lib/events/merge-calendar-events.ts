import type { CalendarEvent } from "@/types/event";

/**
 * Merge global (background layer) + personal events for FullCalendar.
 * RLS already filters server-side; this sorts for visual overlap.
 */
export function mergeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const globalEvents = events.filter((event) => event.is_global);
  const personalEvents = events.filter((event) => !event.is_global);

  return [...globalEvents, ...personalEvents];
}
