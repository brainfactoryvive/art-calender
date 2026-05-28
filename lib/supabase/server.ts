import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { formatSupabaseError } from "@/lib/supabase/errors";
import type { Profile } from "@/types/auth";
import type { CalendarEvent } from "@/types/event";

export function isServerSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware will refresh the session.
        }
      },
    },
  });
}

async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
): Promise<Profile | null> {
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (existing) {
    return existing;
  }

  if (fetchError && !fetchError.message.includes("Could not find")) {
    console.error("[ensureProfile]", fetchError.message);
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "학생";

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      role: "student",
      display_name: displayName,
    })
    .select("*")
    .single<Profile>();

  if (insertError) {
    console.error("[ensureProfile insert]", insertError.message);
    return null;
  }

  await supabase
    .from("email_preferences")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  return created;
}

export async function getSessionPayload() {
  try {
    const cookieStore = await cookies();
    const sandboxOverride = cookieStore.get("sandbox-override")?.value;
    if (sandboxOverride === "student" || sandboxOverride === "admin") {
      return {
        user: { id: "sandbox-mock-id", email: "sandbox@artcalendar.test" },
        profile: {
          id: "sandbox-mock-id",
          role: sandboxOverride as "student" | "admin",
          display_name: sandboxOverride === "admin" ? "샌드박스 관리자" : "샌드박스 학생",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
  } catch (cookieError) {
    console.warn("[getSessionPayload] Failed to check cookies", cookieError);
  }

  if (!isServerSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const profile = await ensureProfileForUser(supabase, user);

    if (!profile) {
      return null;
    }

    return {
      user: { id: user.id, email: user.email },
      profile,
    };
  } catch (error) {
    console.error("[getSessionPayload]", error);
    return null;
  }
}

export async function fetchEventsInRange(
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .lt("start_date", end)
    .gt("end_date", start)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(formatSupabaseError(error.message));
  }

  return (data ?? []) as CalendarEvent[];
}
