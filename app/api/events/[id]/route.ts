import { NextResponse } from "next/server";

import { canDeleteEvent, canEditEvent } from "@/lib/auth/permissions";
import {
  createServerSupabaseClient,
  getSessionPayload,
} from "@/lib/supabase/server";
import type { CalendarEvent, UpsertEventPayload } from "@/types/event";

function validateEventPayload(body: UpsertEventPayload) {
  if (!body.title?.trim()) {
    return "title is required";
  }

  if (!body.start_date || !body.end_date) {
    return "start_date and end_date are required";
  }

  if (new Date(body.end_date) <= new Date(body.start_date)) {
    return "end_date must be after start_date";
  }

  return null;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpsertEventPayload;
    const validationError = validateEventPayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single<CalendarEvent>();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (
      !canEditEvent(existing, session.profile.role, session.user.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatePayload = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      start_date: body.start_date,
      end_date: body.end_date,
      color_code: body.color_code,
      is_global: session.profile.role === "admin" ? true : false,
      is_major:
        session.profile.role === "admin" ? Boolean(body.is_major) : false,
    };

    const { data, error } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single<CalendarEvent>();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (
      !canDeleteEvent(existing, session.profile.role, session.user.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
