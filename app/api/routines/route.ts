import { NextResponse } from "next/server";

import { formatSupabaseError } from "@/lib/supabase/errors";
import { createServerSupabaseClient, getSessionPayload } from "@/lib/supabase/server";
import type { RoutineDraft } from "@/types/routine";
import { ROUTINE_SLOTS } from "@/types/routine";

export async function GET() {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.profile.role !== "student") {
      return NextResponse.json({ routines: [], setupRequired: false });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", session.user.id)
      .order("slot", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: formatSupabaseError(error.message) },
        { status: 500 },
      );
    }

    const routines = data ?? [];
    return NextResponse.json({
      routines,
      setupRequired: routines.length < 3,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? formatSupabaseError(error.message)
        : "Failed to fetch routines";
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
        { error: "Only students can configure routines" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { routines: RoutineDraft[] };

    if (!Array.isArray(body.routines) || body.routines.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 routines are required" },
        { status: 400 },
      );
    }

    const slots = body.routines.map((r) => r.slot).sort();
    if (slots.join(",") !== ROUTINE_SLOTS.join(",")) {
      return NextResponse.json(
        { error: "Routines must use slots 1, 2, and 3" },
        { status: 400 },
      );
    }

    for (const routine of body.routines) {
      if (!routine.emoji?.trim() || !routine.title?.trim()) {
        return NextResponse.json(
          { error: "Each routine needs an emoji and title" },
          { status: 400 },
        );
      }
    }

    const supabase = await createServerSupabaseClient();

    const { error: deleteError } = await supabase
      .from("routines")
      .delete()
      .eq("user_id", session.user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const rows = body.routines.map((routine) => ({
      user_id: session.user.id,
      slot: routine.slot,
      emoji: routine.emoji.trim(),
      title: routine.title.trim(),
    }));

    const { data, error } = await supabase
      .from("routines")
      .insert(rows)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ routines: data, setupRequired: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save routines";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
