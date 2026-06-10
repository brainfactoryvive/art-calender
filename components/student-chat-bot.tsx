"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  AlertTriangle, 
  Loader2,
  Clock,
  User,
  ShieldAlert,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StudentChatBotProps {
  events?: any[];
  routines?: any[];
}

export function StudentChatBot({ events = [], routines = [] }: StudentChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track turn count (capped at 5)
  const [turnCount, setTurnCount] = useState(0);

  // Initialize chatbot
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem("art-calendar-student-chat");
      const savedTurn = localStorage.getItem("art-calendar-student-chat-turn");
      
      if (savedChat) {
        setMessages(JSON.parse(savedChat));
      } else {
        setMessages([
          {
            role: "assistant",
            content: "반가워요! 입시 캘린더와 개인 루틴, 크리틱 피드백을 실시간으로 확인해 주는 학생 AI 비서입니다. 🎨✨\n\n여러분이 작성한 입시 일정, 자습 및 실기 크리틱, 메모, 그리고 3대 루틴의 상태를 한눈에 물어보고 리마인드할 수 있습니다.\n\n예: \"이번 주 내 핵심 크리틱이나 메모가 뭐였지?\""
          }
        ]);
      }
      
      if (savedTurn) {
        setTurnCount(parseInt(savedTurn, 10));
      }
    } catch (e) {
      console.error("Failed to load student chat history", e);
    }
  }, []);

  // Save history and turn count
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("art-calendar-student-chat", JSON.stringify(messages));
        localStorage.setItem("art-calendar-student-chat-turn", turnCount.toString());
      } catch (e) {
        console.error("Failed to save student chat history", e);
      }
    }
  }, [messages, turnCount]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const SUGGEST_CHIPS = [
    { text: "이번 주 등록된 핵심 일정 요약해줘", label: "📅 주요일정 요약" },
    { text: "내 일일 자습/크리틱 피드백과 메모 보여줘", label: "✍️ 크리틱 & 메모" },
    { text: "나의 3대 입시 루틴 실행 현황은 어때?", label: "🔥 3대 루틴 체크" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const resetConversation = () => {
    setTurnCount(0);
    setMessages([
      {
        role: "assistant",
        content: "대화 세션이 리셋되었습니다! 대화는 다시 최대 5회까지 나눌 수 있습니다. 궁금한 일정이 생기면 질문해 주세요! 🎨✨"
      }
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt) return;

    // Check if limit is reached
    if (turnCount >= 5) {
      setError("무료 AI 대화 횟수(5회)를 모두 소모하였습니다. 새로운 세션으로 다시 시작하려면 우측 상단의 '새로고침' 아이콘을 클릭하여 리셋해 주세요.");
      return;
    }

    if (!textToSend) {
      setInput("");
    }
    setError(null);

    // Add user message
    const userMessage: ChatMessage = { role: "user", content: prompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const chatHistory = updatedMessages.slice(-10);

      // Pass user-specific context metadata (events and routines) so the AI can answer accurately on the server
      const res = await fetch("/api/student/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: chatHistory,
          context: {
            events,
            routines
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "메시지 처리 중 오류가 발생했습니다.");
      }

      // Add AI reply
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTurnCount(prev => prev + 1);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "서버 통신 실패");
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 메시지를 처리하는 데 일시적인 장애가 발생했습니다.\n\n사유: ${err.message || "네트워크 불안정"}`
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

  return (
    <>
      {/* Student AI Chat Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-none",
          isOpen 
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
            : "bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 text-white shadow-teal-500/20"
        )}
      >
        {isOpen ? <X className="size-5 animate-spin-once" /> : <MessageSquare className="size-5 animate-pulse" />}
        <span className="text-sm font-extrabold tracking-tight">학생 AI 일정크리틱</span>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Sidebar Chat Drawer */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-[440px] bg-slate-950/95 dark:bg-slate-950/98 border-l border-slate-800/80 shadow-2xl z-50 transform transition-all duration-500 ease-out flex flex-col backdrop-blur-xl text-white",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-teal-950/40 to-slate-950 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

          <div className="flex items-center gap-2.5 z-10">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-lg shadow-md shadow-teal-500/20">
              ✨
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-1.5">
                학생 AI 입시 매니저
              </h3>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span>Gemini 무료 API 구동 중</span>
                <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[8px] font-bold">
                  {turnCount}/5회 대화
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 z-50">
            {turnCount > 0 && (
              <button
                type="button"
                onClick={resetConversation}
                title="대화 초기화"
                className="rounded-full size-9 hover:bg-slate-900 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-colors border-none cursor-pointer text-xs"
              >
                🔄
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="rounded-full size-9 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors border-none cursor-pointer"
              aria-label="닫기"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[linear-gradient(to_bottom,transparent,rgba(16,185,129,0.01))]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {/* Baloon */}
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-inner",
                msg.role === "user"
                  ? "bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-tr-none shadow-teal-700/20"
                  : "bg-slate-900 border border-slate-800/80 text-slate-100 rounded-tl-none shadow-black/40"
              )}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 max-w-[85%] p-3 rounded-2xl bg-slate-900/40 mr-auto border border-slate-800/40 rounded-tl-none">
              <Loader2 className="size-3.5 animate-spin text-teal-400" />
              <span className="text-xs font-semibold animate-pulse">AI가 일지와 일정을 대조 중입니다...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-300 leading-normal animate-shake">
              <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-extrabold text-red-400">오류 또는 제한 도달</p>
                <p className="text-slate-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 border-t border-slate-800/50 bg-slate-950 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider pl-0.5">
            <Compass className="size-3 text-teal-400" />
            내 입시 일정 {"&"} 자습 루틴 요약 질문
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {SUGGEST_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.text)}
                disabled={isLoading || turnCount >= 5}
                className="text-[10px] py-1 px-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-teal-950/20 hover:border-teal-500/40 text-slate-300 hover:text-teal-200 transition-all font-semibold active:scale-95 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                turnCount >= 5 
                  ? "무료 대화 제한에 도달했습니다." 
                  : isLoading 
                    ? "답변 생성 중..." 
                    : "일정, 크리틱, 루틴 실행 정도에 대해 물어보세요..."
              }
              disabled={isLoading || turnCount >= 5}
              className="flex-1 text-sm p-3 pr-12 rounded-xl border border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 font-sans shadow-inner disabled:opacity-50"
            />
            <Button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim() || turnCount >= 5}
              className="absolute right-1.5 top-1.5 size-9 rounded-lg bg-teal-600 hover:bg-teal-700 text-white p-0 flex items-center justify-center shadow-md shadow-teal-600/10 active:scale-95 transition-all"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <div className="mt-2 text-center flex items-center justify-center gap-1.5">
            <span className="text-[9px] text-slate-500 inline-flex items-center gap-1 font-semibold">
              <ShieldAlert className="size-2.5 text-amber-500" />
              학습 일정 외의 사적 대화는 보안 필터에 의해 답변이 거절됩니다.
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
