import type { EventInput } from "@fullcalendar/core";

import type { UserRole } from "@/types/auth";
import type { CalendarEvent } from "@/types/event";

import { canEditEvent } from "@/lib/auth/permissions";

const GLOBAL_READONLY_BG = "#e5e5e5";
const GLOBAL_READONLY_BORDER = "#d4d4d4";
const GLOBAL_READONLY_TEXT = "#525252";

type MapOptions = {
  role: UserRole;
  currentUserId: string;
};

export function mapEventToFullCalendar(
  event: CalendarEvent,
  { role, currentUserId }: MapOptions,
): EventInput {
  const isGlobalReadonly = event.is_global && role === "student";
  const editable = canEditEvent(event, role, currentUserId);

  return {
    id: event.id,
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    editable,
    startEditable: editable,
    durationEditable: editable,
    backgroundColor: isGlobalReadonly ? GLOBAL_READONLY_BG : event.color_code,
    borderColor: isGlobalReadonly ? GLOBAL_READONLY_BORDER : event.color_code,
    textColor: isGlobalReadonly ? GLOBAL_READONLY_TEXT : "#fafafa",
    classNames: isGlobalReadonly
      ? ["fc-event-global-readonly"]
      : ["fc-event-personal"],
    extendedProps: {
      calendarEvent: event,
      description: event.description,
      is_global: event.is_global,
      user_id: event.user_id,
      isReadOnly: isGlobalReadonly,
      canEdit: editable,
    },
  };
}

export function mapEventsToFullCalendar(
  events: CalendarEvent[],
  options: MapOptions,
): EventInput[] {
  return events.map((event) => mapEventToFullCalendar(event, options));
}
