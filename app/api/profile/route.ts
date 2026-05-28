import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  getSessionPayload,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sandboxOverride = cookieStore.get("sandbox-override")?.value;

    if (sandboxOverride === "student" || sandboxOverride === "admin") {
      return NextResponse.json({
        user: { id: "sandbox-mock-id", email: "sandbox@artcalendar.test" },
        profile: {
          id: "sandbox-mock-id",
          role: sandboxOverride,
          display_name: sandboxOverride === "admin" ? "샌드박스 관리자" : "샌드박스 학생",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            ".env.local 에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.",
        },
        { status: 503 },
      );
    }

    const session = await getSessionPayload();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "로그인이 필요하거나 profiles 테이블이 없습니다. SETUP.sql 실행 후 다시 로그인해 주세요.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error
        ? formatSupabaseError(error.message)
        : "프로필을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

