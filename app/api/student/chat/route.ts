import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { messages, context } = await request.json();
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

    // Parse student events & routines context passed from client-side state
    const studentEvents = context?.events || [];
    const studentRoutines = context?.routines || [];

    // Format context text to feed into system prompt
    const formattedEvents = studentEvents.map((evt: any) => {
      const startDate = evt.start_date || evt.start || "";
      const endDate = evt.end_date || evt.end || "";
      const startDateStr = typeof startDate === "string" ? startDate.split("T")[0] : String(startDate);
      const endDateStr = typeof endDate === "string" ? endDate.split("T")[0] : String(endDate);
      const title = evt.title || "제목 없음";
      const description = evt.description || "없음";
      return `- 일정명: ${title} / 기간: ${startDateStr} ~ ${endDateStr} / 설명(메모/크리틱): ${description}`;
    }).join("\n");

    const formattedRoutines = studentRoutines.map((r: any) => {
      const title = r?.title || r?.name || "루틴 이름 없음";
      const description = r?.description || "없음";
      return `- 루틴: ${title} / 상세설명: ${description}`;
    }).join("\n");

    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const todayStr = kstDate.toISOString().split("T")[0];

    const systemPrompt = `You are an Art Academy Student Assistant AI (학생용 입시 일정 및 자습 루틴/크리틱 도우미).
Your task is to help the student look up their personal registered schedules, routine definitions, and daily critic notes or daily logs.

[CRITICAL SECURITY {"&"} SCOPE CONTROL RULES]
1. You can ONLY discuss topics related to the student's admission schedules, registered calendar events, daily notes/memos, daily drawing/design critics, and their 3-routine execution logs.
2. If the user asks about ANYTHING unrelated to art admissions, personal routines, drawing/design critics, or their schedules (e.g., programming codes, recipes, celebrity gossips, general chatbot chat, writing unrelated stories, casual non-study talks), you MUST politely but firmly refuse to answer. Redirect them back to focusing on their admission goals.
   - Example Refusal: "죄송합니다. 저는 브레인팩토리 학생 전용 입시 비서입니다. 입시 일정, 루틴, 크리틱 메모와 무관한 일상 대화나 요청에는 답변을 드리기 어렵습니다. 입시 목표를 향한 학습 루틴 질문을 입력해 주세요! 🎨"
3. Keep your answers warm, encouraging, empathetic, and highly professional. Write in natural, friendly Korean suited for an art high school or college applicant.

[STUDENT ACTIVE CONTEXT DATA]
- Today's Date is: ${todayStr}
- Student's Calendar Schedules {"&"} Critics/Memos:
${formattedEvents || "(등록된 일정이 아직 없습니다. 캘린더에 일정을 직접 기록해 보세요.)"}

- Student's 3-Routine Definitions:
${formattedRoutines || "(설정된 루틴이 아직 없습니다.)"}

Ensure you refer directly to this context when the student asks about their notes, schedules, routines, or credits!
`;

    // Connect to Google Gemini 1.5/2.5 Flash Free Tier
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

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
          maxOutputTokens: 800,
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Student AI API Error:", errorText);
      return NextResponse.json({ error: "학생 AI 처리 중 에러가 발생했습니다." }, { status: 502 });
    }

    const rawData = await response.json();
    const geminiText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!geminiText) {
      return NextResponse.json({ error: "AI가 응답을 생성하지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json({
      reply: geminiText.trim()
    });

  } catch (error) {
    console.error("Student Chat API crash:", error);
    return NextResponse.json({ error: "서버 처리 중 알 수 없는 에러가 발생했습니다." }, { status: 500 });
  }
}
