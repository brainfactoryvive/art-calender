"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Loader2,
  Clock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  events?: any[];
}

interface AdminChatBotProps {
  onEventsUploaded: (
    events: any[],
    deletedEventIds?: string[],
    deletedPatterns?: any[]
  ) => void;
}

export function AdminChatBot({ onEventsUploaded }: AdminChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "안녕하세요, 원장님! 미술학원의 일정을 관리하는 AI 비서입니다. 🎨✨\n\n달력을 일일이 클릭하지 않으셔도 대화하듯 편하게 말씀하시면 일정을 한 번에 등록해 드립니다.\n\n예: \"내일 오후 2시 소묘 집중 피드백 3시간 등록해줘\""
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const SUGGEST_CHIPS = [
    { text: "내일 오후 2시 소묘 피드백 등록", label: "⏳ 내일 일정" },
    { text: "다음 주 월요일부터 3일간 모의고사 설정", label: "📝 단기 모의고사" },
    { text: "6월 15일 석가탄신일 전체 휴강 잡아줘", label: "🏖️ 휴일 등록" }
  ];

  // 메시지 목록 맨 아래로 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt) return;

    if (!textToSend) {
      setInput("");
    }
    setError(null);

    // 사용자 메시지 추가
    const userMessage: ChatMessage = { role: "user", content: prompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // API 라우트에 요청 (이전 10개 대화 내역 전송)
      const chatHistory = updatedMessages.slice(-10);

      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "일정 처리 중 오류가 발생했습니다.");
      }

      // AI의 답변 메시지 추가
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
        events: data.events
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 일정이 성공적으로 등록되거나 삭제되었다면 부모 캘린더 새로고침 유도
      if (
        (data.events && data.events.length > 0) || 
        (data.deletedEventIds && data.deletedEventIds.length > 0) ||
        (data.deletedPatterns && data.deletedPatterns.length > 0)
      ) {
        onEventsUploaded(data.events || [], data.deletedEventIds, data.deletedPatterns);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "서버 통신 실패");
      
      // 사용자 친화적 에러 메시지 챗 추가
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 일정 처리 중 오류가 발생했습니다.\n\n사유: ${err.message || "네트워크 연결 지연"}\n\n만약 API 키가 설정되지 않았다면 .env.local 파일을 확인해 주세요.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 날짜 형식 예쁘게 변환
  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${m}월 ${d}일 ${h}:${min}`;
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* 둥둥 떠다니는 인공지능 비서 탭 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-none",
          isOpen 
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-indigo-500/20"
        )}
      >
        {isOpen ? <X className="size-5 animate-spin-once" /> : <MessageSquare className="size-5 animate-pulse" />}
        <span className="text-sm font-extrabold tracking-tight">AI 비서 일정등록</span>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
          </span>
        )}
      </button>

      {/* 사이드바 대화 위젯 (Glassmorphism & Neon Glow) */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-[440px] bg-slate-950/95 dark:bg-slate-950/98 border-l border-slate-800/80 shadow-2xl z-50 transform transition-all duration-500 ease-out flex flex-col backdrop-blur-xl text-white",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

          <div className="flex items-center gap-2 z-10">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">
              ✨
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-1">
                AI 학원 관리 일정비서
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Gemini 2.5 Flash로 안전하게 작동 중</p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="rounded-full size-8 hover:bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* 대화 히스토리 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[linear-gradient(to_bottom,transparent,rgba(99,102,241,0.01))]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {/* 말풍선 */}
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-inner",
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-700/20"
                  : "bg-slate-900 border border-slate-800/80 text-slate-100 rounded-tl-none shadow-black/40"
              )}>
                {msg.content}
              </div>

              {/* 일정 성공 등록 카드가 포함된 경우 렌더링 */}
              {msg.events && msg.events.length > 0 && (
                <div className="mt-2 w-full space-y-2 animate-in zoom-in-95 duration-300">
                  <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-wider pl-1">
                    <CheckCircle className="size-3 text-emerald-400" />
                    등록 완료된 일정 목록 ({msg.events.length}건)
                  </p>
                  {msg.events.map((evt, eIdx) => (
                    <div 
                      key={eIdx} 
                      className="border border-slate-800 bg-slate-950/60 p-3 rounded-xl flex items-start gap-2.5 shadow-md relative overflow-hidden"
                    >
                      {/* 카드 왼편 세로 액센트 라인 */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1" 
                        style={{ backgroundColor: evt.color_code || "#3b82f6" }}
                      />
                      <Calendar className="size-4 shrink-0 mt-0.5" style={{ color: evt.color_code || "#3b82f6" }} />
                      <div className="min-w-0 flex-1 pl-1">
                        <h4 className="text-xs font-bold text-white truncate">{evt.title}</h4>
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 shrink-0" />
                            {formatEventTime(evt.start_date)} ~ {formatEventTime(evt.end_date)}
                          </span>
                          {evt.description && (
                            <p className="text-[9px] text-slate-500 truncate leading-relaxed mt-0.5 italic">
                              &ldquo;{evt.description}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 접고 캘린더 확인하기 버튼 */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full mt-2 text-[10px] py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    접고 연간 캘린더 확인하기 <ArrowRight className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 max-w-[85%] p-3 rounded-2xl bg-slate-900/40 mr-auto border border-slate-800/40 rounded-tl-none">
              <Loader2 className="size-3.5 animate-spin text-indigo-400" />
              <span className="text-xs font-semibold animate-pulse">AI가 일정을 등록하는 중입니다...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-300 leading-normal animate-shake">
              <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-extrabold text-red-400">일정 업로드 실패</p>
                <p className="text-slate-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 퀵 칩 패널 */}
        <div className="p-3 border-t border-slate-800/50 bg-slate-950 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider pl-0.5">
            <Sparkles className="size-3 text-indigo-400" />
            빠른 명령어 추천 (터치해 보세요)
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {SUGGEST_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.text)}
                disabled={isLoading}
                className="text-[10px] py-1 px-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-indigo-950/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 transition-all font-semibold active:scale-95 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 도구 바 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI 응답을 기다리는 중..." : "일정 내용을 편하게 말씀해 주세요..."}
              disabled={isLoading}
              className="flex-1 text-sm p-3 pr-12 rounded-xl border border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 font-sans shadow-inner disabled:opacity-50"
            />
            <Button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 top-1.5 size-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white p-0 flex items-center justify-center shadow-md shadow-indigo-600/10 active:scale-95 transition-all"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[9px] text-slate-500 inline-flex items-center gap-1 font-semibold">
              <HelpCircle className="size-2.5" />
              대화형 일정비서는 일정 등록 외의 개인 대화는 처리하지 않습니다.
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
