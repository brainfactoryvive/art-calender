import type { UserRole } from "@/types/auth";
import type { CalendarEvent } from "@/types/event";

export function canCreateOnDateClick(role: UserRole): boolean {
  return role === "admin" || role === "student";
}

export function canEditEvent(
  event: CalendarEvent,
  role: UserRole,
  userId: string,
): boolean {
  if (role === "admin") {
    return event.is_global;
  }

  return !event.is_global && event.user_id === userId;
}

export function canDeleteEvent(
  event: CalendarEvent,
  role: UserRole,
  userId: string,
): boolean {
  return canEditEvent(event, role, userId);
}

export function defaultIsGlobalForRole(role: UserRole): boolean {
  return role === "admin";
}
