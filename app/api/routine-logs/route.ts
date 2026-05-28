import { NextResponse } from "next/server";

import { createServerSupabaseClient, getSessionPayload } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end (YYYY-MM-DD) are required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("routine_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("log_date", start)
      .lte("log_date", end);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch routine logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can log routines" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      routine_id: string;
      log_date: string;
      completed?: boolean;
    };

    if (!body.routine_id || !body.log_date) {
      return NextResponse.json(
        { error: "routine_id and log_date are required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from("routine_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("routine_id", body.routine_id)
      .eq("log_date", body.log_date)
      .maybeSingle();

    const nextCompleted =
      body.completed !== undefined
        ? body.completed
        : !(existing?.completed ?? false);

    if (existing) {
      const { data, error } = await supabase
        .from("routine_logs")
        .update({ completed: nextCompleted })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ log: data });
    }

    const { data, error } = await supabase
      .from("routine_logs")
      .insert({
        user_id: session.user.id,
        routine_id: body.routine_id,
        log_date: body.log_date,
        completed: nextCompleted,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ log: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update routine log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
