/**
 * =============================================================================
 * 이메일 알림 — 2단계: 실제 발송 (Resend)
 * =============================================================================
 * 1. Resend(https://resend.com) 가입 → API Key 발급 → 발신 도메인 인증
 * 2. Supabase secrets 설정:
 *      supabase secrets set RESEND_API_KEY=re_xxxx
 *      supabase secrets set SUPABASE_URL=https://xxx.supabase.co
 *      supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * 3. 배포: supabase functions deploy send-pending-emails
 * 4. Cron (Dashboard → Edge Functions → Schedules): */5 * * * * (5분마다)
 *
 * 흐름: /api/cron/email-notifications → email_notification_log(pending)
 *       → 이 함수 → Resend API → status=sent
 * =============================================================================
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async () => {
  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response("Missing env", { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: pending } = await supabase
    .from("email_notification_log")
    .select("*")
    .eq("status", "pending")
    .limit(50);

  let sent = 0;

  for (const row of pending ?? []) {
    const html =
      row.notification_type === "weekly_digest"
        ? `<p>${row.subject}</p><p>앱에서 자세한 일정을 확인하세요.</p>`
        : `<p>${row.subject}</p><p>내일 일정을 확인하세요.</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "입시일정 <noreply@yourdomain.com>",
        to: row.recipient_email,
        subject: row.subject,
        html,
      }),
    });

    await supabase
      .from("email_notification_log")
      .update({
        status: res.ok ? "sent" : "failed",
        sent_at: new Date().toISOString(),
        error_message: res.ok ? null : await res.text(),
      })
      .eq("id", row.id);

    if (res.ok) sent += 1;
  }

  return Response.json({ processed: pending?.length ?? 0, sent });
});
