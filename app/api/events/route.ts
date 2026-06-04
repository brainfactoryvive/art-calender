import { NextResponse } from "next/server";

import { defaultIsGlobalForRole } from "@/lib/auth/permissions";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  createServerSupabaseClient,
  fetchEventsInRange,
  getSessionPayload,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";
import type { UpsertEventPayload } from "@/types/event";

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

export async function GET(request: Request) {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase 환경 변수가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.id === "sandbox-mock-id") {
      // 처음부터 깨끗한 달력에서 등록 성능을 테스트할 수 있도록 모의 예시 일정을 모두 비워두었습니다!
      const mockEvents: any[] = [];
      return NextResponse.json({ events: mockEvents, role: session.profile.role });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end query params are required (ISO 8601)" },
        { status: 400 },
      );
    }

    const events = await fetchEventsInRange(start, end);
    return NextResponse.json({ events, role: session.profile.role });
  } catch (error) {
    const message =
      error instanceof Error
        ? formatSupabaseError(error.message)
        : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UpsertEventPayload;
    const validationError = validateEventPayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (session.user.id === "sandbox-mock-id") {
      const mockCreatedEvent = {
        id: `mock-event-${Date.now()}`,
        user_id: "sandbox-mock-id",
        title: body.title.trim(),
        description: body.description?.trim() || null,
        start_date: body.start_date,
        end_date: body.end_date,
        color_code: body.color_code,
        is_global: session.profile.role === "admin" ? defaultIsGlobalForRole(session.profile.role) : false,
        is_major: session.profile.role === "admin" ? Boolean(body.is_major) : false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ event: mockCreatedEvent }, { status: 201 });
    }

    const role = session.profile.role;

    if (role === "student" && body.is_global) {
      return NextResponse.json(
        { error: "Students cannot create global events" },
        { status: 403 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: session.user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        start_date: body.start_date,
        end_date: body.end_date,
        color_code: body.color_code,
        is_global: role === "admin" ? defaultIsGlobalForRole(role) : false,
        is_major: role === "admin" ? Boolean(body.is_major) : false,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
