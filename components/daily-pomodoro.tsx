"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Clock,
  Flame,
  CheckCircle2,
  Target,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PomodoroTask {
  id: string;
  title: string;
  targetMinutes: number;
  completedMinutes: number;
  status: "pending" | "completed";
  createdAt: number;
}

interface DailyPomodoroProps {
  date: Date;
}

export function DailyPomodoro({ date }: DailyPomodoroProps) {
  // 날짜 스트링 포맷 (YYYY-MM-DD)
  const dateKey = (() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState<number>(25);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // 초 단위
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [initialTime, setInitialTime] = useState<number>(25 * 60); // 전체 설정된 시간 (초)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 로컬스토리지에서 데이터 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`pomodoro_tasks_${dateKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PomodoroTask[];
          setTasks(parsed);

          // 만약 이전에 진행 중이던 태스크가 있다면 세팅
          const pendingTask = parsed.find((t) => t.status === "pending");
          if (pendingTask) {
            setActiveTaskId(pendingTask.id);
            setTimeLeft(pendingTask.targetMinutes * 60);
            setInitialTime(pendingTask.targetMinutes * 60);
          } else if (parsed.length > 0) {
            setActiveTaskId(parsed[0].id);
            setTimeLeft(parsed[0].targetMinutes * 60);
            setInitialTime(parsed[0].targetMinutes * 60);
          } else {
            setActiveTaskId(null);
            setTimeLeft(25 * 60);
            setInitialTime(25 * 60);
          }
        } catch (e) {
          console.error("Failed to load pomodoro tasks", e);
        }
      } else {
        setTasks([]);
        setActiveTaskId(null);
        setTimeLeft(25 * 60);
        setInitialTime(25 * 60);
      }
      setIsRunning(false);
    }
  }, [dateKey]);

  // 로컬스토리지에 데이터 저장
  const saveTasks = (updatedTasks: PomodoroTask[]) => {
    setTasks(updatedTasks);
    if (typeof window !== "undefined") {
      localStorage.setItem(`pomodoro_tasks_${dateKey}`, JSON.stringify(updatedTasks));
    }
  };

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            
            // 타이머 완료 시 자동 태스크 완료 처리
            handleCompleteActiveTask();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activeTaskId, timeLeft]);

  // 현재 선택된 태스크 정보
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  // 새 태스크 추가
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: PomodoroTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle.trim(),
      targetMinutes: newMinutes > 0 ? newMinutes : 25,
      completedMinutes: 0,
      status: "pending",
      createdAt: Date.now(),
    };

    const updated = [...tasks, newTask];
    saveTasks(updated);

    // 만약 현재 활성화된 태스크가 없거나 기본 상태라면 새로 추가한 태스크를 활성화
    if (!activeTaskId || tasks.length === 0) {
      setActiveTaskId(newTask.id);
      setTimeLeft(newTask.targetMinutes * 60);
      setInitialTime(newTask.targetMinutes * 60);
      setIsRunning(false);
    }

    setNewTitle("");
  };

  // 태스크 선택 변경
  const handleSelectTask = (taskId: string) => {
    if (isRunning) {
      if (!confirm("현재 작동 중인 타이머가 있습니다. 목표를 변경하고 리셋하시겠습니까?")) {
        return;
      }
    }
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setActiveTaskId(taskId);
      setIsRunning(false);
      const remainingSeconds = target.status === "completed" 
        ? 0 
        : (target.targetMinutes - target.completedMinutes) * 60;
      setTimeLeft(remainingSeconds);
      setInitialTime(target.targetMinutes * 60);
    }
  };

  // 태스크 삭제
  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);

    if (activeTaskId === taskId) {
      const nextPending = updated.find((t) => t.status === "pending");
      if (nextPending) {
        setActiveTaskId(nextPending.id);
        setTimeLeft(nextPending.targetMinutes * 60);
        setInitialTime(nextPending.targetMinutes * 60);
      } else if (updated.length > 0) {
        setActiveTaskId(updated[0].id);
        setTimeLeft(updated[0].targetMinutes * 60);
        setInitialTime(updated[0].targetMinutes * 60);
      } else {
        setActiveTaskId(null);
        setTimeLeft(25 * 60);
        setInitialTime(25 * 60);
      }
      setIsRunning(false);
    }
  };

  // 현재 활성화된 태스크 완료(성취) 처리
  const handleCompleteActiveTask = () => {
    if (!activeTaskId) return;

    const updated = tasks.map((t) => {
      if (t.id === activeTaskId) {
        return {
          ...t,
          status: "completed" as const,
          completedMinutes: t.targetMinutes, // 전역 완성
        };
      }
      return t;
    });

    saveTasks(updated);
    setIsRunning(false);

    // 다음 대기 태스크 선택 자동화
    const nextPending = updated.find((t) => t.status === "pending" && t.id !== activeTaskId);
    if (nextPending) {
      setActiveTaskId(nextPending.id);
      setTimeLeft(nextPending.targetMinutes * 60);
      setInitialTime(nextPending.targetMinutes * 60);
    } else {
      setTimeLeft(0);
    }

    // 오디오 피드백 또는 화려한 알림 (선택 사항)
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      // 오디오 에러 무시
    }
  };

  // 현재 활성화된 태스크 달성 수동 토글
  const handleToggleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const isComp = t.status === "completed";
        return {
          ...t,
          status: isComp ? ("pending" as const) : ("completed" as const),
          completedMinutes: isComp ? 0 : t.targetMinutes,
        };
      }
      return t;
    });

    saveTasks(updated);

    // 상태 토글 후 타이머 싱크 조절
    if (taskId === activeTaskId) {
      const target = updated.find((t) => t.id === taskId);
      if (target) {
        setIsRunning(false);
        setTimeLeft(target.status === "completed" ? 0 : target.targetMinutes * 60);
      }
    }
  };

  // 타이머 리셋
  const handleResetTimer = () => {
    if (activeTask) {
      setTimeLeft(activeTask.targetMinutes * 60);
      setInitialTime(activeTask.targetMinutes * 60);
    } else {
      setTimeLeft(25 * 60);
      setInitialTime(25 * 60);
    }
    setIsRunning(false);
  };

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 성취 요약 통계 계산
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const totalCompletedMinutes = completedTasks.reduce((acc, curr) => acc + curr.targetMinutes, 0);

  // SVG 원형 프로그레스 계산
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = initialTime > 0 
    ? circumference - (timeLeft / initialTime) * circumference 
    : 0;

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 좌측: 타이머 패널 (Glassmorphism & Neon Glow) */}
      <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-blue-500/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-indigo-950/90 p-8 shadow-xl text-white relative overflow-hidden min-h-[26rem]">
        
        {/* 장식용 그리드 배경 및 오라 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          {/* 상단 날짜 및 현재 할 일 */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <Clock className="size-3.5" />
              {date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} 집중
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white mt-3 truncate max-w-xs">
              {activeTask ? activeTask.title : "할 일을 먼저 추가해 보세요"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeTask 
                ? `목표 시간: ${activeTask.targetMinutes}분` 
                : "목표를 추가하고 타이머를 시작하여 몰입하세요"}
            </p>
          </div>

          {/* 원형 시각적 타이머 게이지 */}
          <div className="relative flex items-center justify-center my-4">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="transform -rotate-90 drop-shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            >
              {/* 배경 원 */}
              <circle
                stroke="rgba(255, 255, 255, 0.04)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* 진행 원 */}
              <circle
                stroke="url(#timerGradient)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + " " + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-300 ease-linear"
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>

            {/* 타이머 내부 시간 텍스트 */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className={cn(
                "text-4xl font-extrabold tracking-tighter tabular-nums font-mono transition-all duration-300",
                isRunning ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" : "text-white"
              )}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-slate-400 font-medium tracking-wider mt-1 uppercase">
                {isRunning ? "Focusing" : "Paused"}
              </span>
            </div>
          </div>

          {/* 컨트롤러 버튼 */}
          <div className="flex items-center gap-4 mt-8 w-full justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleResetTimer}
              className="rounded-full size-12 border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-inner"
              title="리셋"
              disabled={!activeTaskId}
            >
              <RotateCcw className="size-5" />
            </Button>

            <Button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              disabled={!activeTaskId || timeLeft <= 0}
              className={cn(
                "rounded-full size-16 shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center border-none",
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-red-500 text-white hover:from-amber-600 hover:to-red-600 shadow-amber-500/20"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20"
              )}
            >
              {isRunning ? <Pause className="size-7 fill-white" /> : <Play className="size-7 fill-white ml-1" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCompleteActiveTask}
              disabled={!activeTaskId || activeTask?.status === "completed"}
              className="rounded-full size-12 border-slate-700 bg-slate-800/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all shadow-inner"
              title="즉시 달성 완료"
            >
              <Check className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 우측: 목표 설정 및 성취 현황 */}
      <div className="w-full lg:w-96 flex flex-col gap-5">
        
        {/* 새 목표 추가 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
            <Target className="size-4 text-indigo-500" />
            오늘의 집중 목표 추가
          </h3>

          <form onSubmit={handleAddTask} className="space-y-3">
            <Input
              type="text"
              placeholder="예: 공부종류, 실기 그림작업, 수능연습..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-sm rounded-lg"
              maxLength={40}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">
                목표 시간 설정 (분)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                  className="text-sm rounded-lg w-20"
                />
                <div className="flex gap-1 flex-1">
                  {[15, 25, 50, 60].map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setNewMinutes(m)}
                      className={cn(
                        "flex-1 text-xs rounded-md py-1 px-0 h-auto",
                        newMinutes === m && "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      {m}분
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!newTitle.trim()}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold text-sm mt-1"
            >
              <Plus className="size-4" /> 목표 추가
            </Button>
          </form>
        </div>

        {/* 성취 누적 대시보드 */}
        <div className="rounded-2xl border border-blue-500/10 bg-gradient-to-r from-blue-50/20 to-indigo-50/20 dark:from-blue-950/10 dark:to-indigo-950/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-lg shadow-inner">
              🔥
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                오늘의 몰입 요약
              </p>
              <h4 className="text-sm font-bold text-foreground mt-0.5">
                완료 {completedTasks.length}개 / 총 {tasks.length}개
              </h4>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-500/10 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Flame className="size-3.5 text-orange-500" />
              성취한 총 시간
            </span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {totalCompletedMinutes > 0 ? (
                <>
                  {Math.floor(totalCompletedMinutes / 60) > 0 && `${Math.floor(totalCompletedMinutes / 60)}시간 `}
                  {totalCompletedMinutes % 60}분
                </>
              ) : (
                "0분"
              )}
            </span>
          </div>
        </div>

        {/* 목표 및 성취 목록 */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col min-h-[16rem]">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="size-4 text-emerald-500" />
            목표 목록 & 달성 현황
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[18rem] pr-1">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-muted rounded-xl">
                <AlertCircle className="size-6 text-muted-foreground stroke-1 mb-2" />
                <p className="text-xs text-muted-foreground">등록된 할 일이 없습니다.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">새 목표를 추가하여 일간 일정을 시작해 보세요!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task.id)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm",
                    task.id === activeTaskId
                      ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                      : "border-border bg-muted/20 hover:bg-muted/40",
                    task.status === "completed" && "opacity-70 border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/5"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(task.id, e)}
                      className={cn(
                        "size-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                        task.status === "completed"
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-900"
                      )}
                    >
                      {task.status === "completed" && <Check className="size-3 stroke-[3]" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm font-semibold truncate text-foreground",
                        task.status === "completed" && "line-through text-muted-foreground font-normal"
                      )}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" /> {task.targetMinutes}분 설정
                        {task.status === "completed" && (
                          <span className="text-emerald-500 dark:text-emerald-400 font-semibold ml-1 bg-emerald-500/10 px-1 py-0.2 rounded text-[9px]">
                            달성 완료!
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
