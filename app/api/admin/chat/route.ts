import { NextResponse } from "next/server";
import { getSessionPayload, createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultIsGlobalForRole } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages 배열이 유효하지 않습니다." }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    // 오늘 날짜 및 요일 구하기 (한국 시간 기준)
    const now = new Date();
    // UTC -> KST 변환 보정
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const todayStr = kstDate.toISOString().split("T")[0];
    const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const dayOfWeek = days[kstDate.getUTCDay()];

    const systemPrompt = `You are a scheduling AI assistant for an Art Academy Calendar (관리자용 일정 업로드 비서).
Your goal is to parse user schedule instructions and output a structured JSON containing a conversational response and a list of structured calendar events to register.

- Current Today's Date is: ${todayStr} (${dayOfWeek}).
- Calculate relative terms (e.g. "내일" -> ${new Date(kstDate.getTime() + 24*3600*1000).toISOString().split("T")[0]}, "다음 주 월요일", "6월 중순") precisely based on today's date (${todayStr}).
- If the instruction does not specify hours, default to a full day (start_date at 00:00:00, end_date at 23:59:59) or reasonable business hours (e.g., 10:00:00 to 18:00:00).
- Assign appropriate color codes based on schedule importance:
  - Red (#ef4444): Exams, evaluations, major deadlines (is_major = true).
  - Blue (#3b82f6): Regular lectures, classes.
  - Green (#10b981): Holidays, breaks.
  - Purple (#8b5cf6): Special feedback sessions, 1:1 consulting.
  - Orange (#f97316): Submissions, portfolio deadlines.
- CRITICAL COLOR RULE FOR OVERLAPPING EVENTS: If multiple events run in parallel, overlap, or are registered in the same timeframe, DO NOT assign them the same color code. Alternate and distribute different color codes (e.g. Blue, Purple, Orange) so they stand out as separate, recognizable colored bars on the calendar.
- Keep the 'reply' conversational, helpful, encouraging, and written in natural Korean. (e.g. "알겠습니다! 6월 15일~17일 기말고사 일정을 캘린더에 성공적으로 등록해 드릴게요. 🎨✨")
`;

    // Gemini API Request Payload 만들기
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    // 이전 대화 내역에 시스템 프롬프트 결합
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    ];

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: {
                type: "STRING",
                description: "Conversational answer in friendly Korean to the administrator confirming action."
              },
              events: {
                type: "ARRAY",
                description: "List of calendar events parsed and extracted from user prompt.",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Name of schedule" },
                    description: { type: "STRING", description: "Details of schedule" },
                    start_date: { type: "STRING", description: "ISO 8601 string, e.g. 2026-06-15T14:00:00Z" },
                    end_date: { type: "STRING", description: "ISO 8601 string, e.g. 2026-06-15T18:00:00Z" },
                    color_code: { type: "STRING", description: "Hex color code" },
                    is_major: { type: "BOOLEAN", description: "Whether this is a major highlighted event" }
                  },
                  required: ["title", "start_date", "end_date", "color_code", "is_major"]
                }
              }
            },
            required: ["reply", "events"]
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: "인공지능 처리 중 에러가 발생했습니다." }, { status: 502 });
    }

    const rawData = await response.json();
    const geminiText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiText) {
      return NextResponse.json({ error: "인공지능이 응답을 생성하지 못했습니다." }, { status: 502 });
    }

    // JSON 파싱
    const result = JSON.parse(geminiText);
    const parsedEvents = result.events || [];

    // DB 저장 또는 샌드박스 가상 저장 분기
    const savedEvents = [];
    const isSandbox = session.user.id === "sandbox-mock-id";

    if (isSandbox) {
      // 샌드박스 모드일 때는 Mock ID를 달아서 그대로 프론트엔드로 전달
      for (const event of parsedEvents) {
        savedEvents.push({
          id: `mock-event-${Math.random().toString(36).substr(2, 9)}`,
          user_id: session.user.id,
          title: event.title.trim(),
          description: event.description || null,
          start_date: event.start_date,
          end_date: event.end_date,
          color_code: event.color_code || "#3b82f6",
          is_global: true,
          is_major: Boolean(event.is_major),
          created_at: new Date().toISOString()
        });
      }
    } else {
      // 실 DB 저장
      const supabase = await createServerSupabaseClient();
      for (const event of parsedEvents) {
        const { data, error } = await supabase
          .from("events")
          .insert({
            user_id: session.user.id,
            title: event.title.trim(),
            description: event.description || null,
            start_date: event.start_date,
            end_date: event.end_date,
            color_code: event.color_code || "#3b82f6",
            is_global: defaultIsGlobalForRole(session.profile.role),
            is_major: Boolean(event.is_major)
          })
          .select("*")
          .single();

        if (error) {
          console.error("Supabase Save Error:", error);
        } else if (data) {
          savedEvents.push(data);
        }
      }
    }

    return NextResponse.json({
      reply: result.reply,
      events: savedEvents,
      isSandbox
    });

  } catch (error) {
    console.error("Admin Chat API crash:", error);
    return NextResponse.json({ error: "서버 처리 중 알 수 없는 에러가 발생했습니다." }, { status: 500 });
  }
}
