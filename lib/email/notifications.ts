import type { CalendarEvent } from "@/types/event";

export type EmailNotificationType = "weekly_digest" | "event_reminder";

export function buildWeeklyDigestSubject(weekLabel: string): string {
  return `[입시 일정] ${weekLabel} 주간 일정 요약`;
}

export function buildWeeklyDigestHtml(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "<p>이번 주 예정된 전역 입시 일정이 없습니다.</p>";
  }

  const items = events
    .map(
      (event) =>
        `<li><strong>${event.title}</strong><br/>${formatRange(event.start_date, event.end_date)}</li>`,
    )
    .join("");

  return `<p>이번 주 전역 입시 일정입니다.</p><ul>${items}</ul>`;
}

export function buildReminderSubject(event: CalendarEvent): string {
  return `[입시 일정 D-1] ${event.title}`;
}

export function buildReminderHtml(event: CalendarEvent): string {
  return `<p>내일 예정된 주요 입시 일정입니다.</p>
    <p><strong>${event.title}</strong></p>
    <p>${formatRange(event.start_date, event.end_date)}</p>
    ${event.description ? `<p>${event.description}</p>` : ""}`;
}

function formatRange(start: string, end: string): string {
  const s = new Date(start).toLocaleString("ko-KR");
  const e = new Date(end).toLocaleString("ko-KR");
  return `${s} ~ ${e}`;
}
