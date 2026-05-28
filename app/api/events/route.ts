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
      const mockEvents = [
        {
          id: "mock-event-1",
          user_id: "sandbox-mock-id",
          title: "어린이날 미술학원 휴강",
          description: "어린이날 전체 휴강입니다. 자율 연습실은 개방합니다.",
          start_date: "2026-05-05T00:00:00Z",
          end_date: "2026-05-05T23:59:59Z",
          color_code: "#10b981",
          is_global: true,
          is_major: false,
        },
        {
          id: "mock-event-2",
          user_id: "sandbox-mock-id",
          title: "스승의날 소묘 피드백",
          description: "선생님들과의 1:1 심층 소묘 평가 및 진학 피드백 시간",
          start_date: "2026-05-15T14:00:00Z",
          end_date: "2026-05-15T18:00:00Z",
          color_code: "#8b5cf6",
          is_global: true,
          is_major: false,
        },
        {
          id: "mock-event-3",
          user_id: "sandbox-mock-id",
          title: "중간고사 미술 모의 평가",
          description: "실전 실기 시험 분위기에서 치러지는 중간 모의평가",
          start_date: "2026-05-20T09:00:00Z",
          end_date: "2026-05-22T18:00:00Z",
          color_code: "#ef4444",
          is_global: true,
          is_major: true,
        },
        {
          id: "mock-event-4",
          user_id: "sandbox-mock-id",
          title: "입시 1차 포트폴리오 마감일",
          description: "1차 피드백용 포트폴리오를 제출해 주세요.",
          start_date: "2026-05-28T00:00:00Z",
          end_date: "2026-05-28T23:59:59Z",
          color_code: "#f97316",
          is_global: true,
          is_major: true,
        },
        {
          id: "mock-event-5",
          user_id: "sandbox-mock-id",
          title: "오늘의 인체 크로키 50장 연습",
          description: "개인 실기 연습 과제",
          start_date: "2026-05-29T10:00:00Z",
          end_date: "2026-05-29T13:00:00Z",
          color_code: "#3b82f6",
          is_global: false,
          is_major: false,
        },
        {
          id: "mock-event-6",
          user_id: "sandbox-mock-id",
          title: "예술대학 연합 모의평가",
          description: "전국 규모 연합 모의 실기 고사",
          start_date: "2026-06-10T09:00:00Z",
          end_date: "2026-06-10T18:00:00Z",
          color_code: "#ef4444",
          is_global: true,
          is_major: true,
        },
      ];
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
