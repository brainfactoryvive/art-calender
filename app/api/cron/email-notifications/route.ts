import { NextResponse } from "next/server";

import {
  buildReminderHtml,
  buildReminderSubject,
  buildWeeklyDigestHtml,
  buildWeeklyDigestSubject,
} from "@/lib/email/notifications";
import { createServiceClient } from "@/lib/supabase/admin";
import type { CalendarEvent } from "@/types/event";

/**
 * =============================================================================
 * 이메일 알림 — 1단계: 큐 적재 (이 API)
 * =============================================================================
 * 전역 일정(is_global=true) 기준으로 email_notification_log에 pending row 생성.
 * 실제 발송은 2단계 Edge Function + Resend가 담당합니다.
 *
 * [조건 1] weekly_digest — 해당 주 전역 일정 요약 (주 1회, 월요일 09:00 KST 권장)
 * [조건 2] event_reminder — is_major=true 일정 시작 24시간 전 (매시간 Cron)
 *
 * Vercel Cron 예시 (vercel.json):
 *   { "path": "/api/cron/email-notifications?job=weekly_digest", "schedule": "0 0 * * 1" }
 *   { "path": "/api/cron/email-notifications?job=event_reminder", "schedule": "0 * * * *" }
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 * Env: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
 * =============================================================================
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job") as
    | "weekly_digest"
    | "event_reminder"
    | null;

  if (!job || !["weekly_digest", "event_reminder"].includes(job)) {
    return NextResponse.json(
      { error: "job query param required: weekly_digest | event_reminder" },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient();
    const now = new Date();

    if (job === "weekly_digest") {
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("is_global", true)
        .lt("start_date", weekEnd.toISOString())
        .gt("end_date", weekStart.toISOString())
        .order("start_date", { ascending: true });

      const { data: students } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("role", "student");

      const weekLabel = weekStart.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      });

      let queued = 0;
      for (const student of students ?? []) {
        const { data: prefs } = await supabase
          .from("email_preferences")
          .select("weekly_digest_enabled")
          .eq("user_id", student.id)
          .maybeSingle();

        if (prefs && !prefs.weekly_digest_enabled) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(
          student.id,
        );
        const email = authUser.user?.email;
        if (!email) continue;

        await supabase.from("email_notification_log").insert({
          user_id: student.id,
          notification_type: "weekly_digest",
          recipient_email: email,
          subject: buildWeeklyDigestSubject(weekLabel),
          status: "pending",
          scheduled_for: now.toISOString(),
        });

        queued += 1;
      }

      return NextResponse.json({
        job,
        queued,
        events: (events as CalendarEvent[])?.length ?? 0,
        previewHtml: buildWeeklyDigestHtml((events as CalendarEvent[]) ?? []),
      });
    }

    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("is_global", true)
      .eq("is_major", true)
      .gte("start_date", windowStart.toISOString())
      .lte("start_date", windowEnd.toISOString());

    const { data: students } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "student");

    let queued = 0;
    for (const event of (events as CalendarEvent[]) ?? []) {
      for (const student of students ?? []) {
        const { data: prefs } = await supabase
          .from("email_preferences")
          .select("event_reminder_enabled")
          .eq("user_id", student.id)
          .maybeSingle();

        if (prefs && !prefs.event_reminder_enabled) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(
          student.id,
        );
        const email = authUser.user?.email;
        if (!email) continue;

        await supabase.from("email_notification_log").insert({
          user_id: student.id,
          notification_type: "event_reminder",
          event_id: event.id,
          recipient_email: email,
          subject: buildReminderSubject(event),
          status: "pending",
          scheduled_for: now.toISOString(),
        });

        queued += 1;
      }
    }

    return NextResponse.json({
      job,
      queued,
      events: events?.length ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}
