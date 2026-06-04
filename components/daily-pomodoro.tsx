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
  Palette,
  Type,
  Pen,
  Eraser,
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
  const [feedback, setFeedback] = useState("");

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // 초 단위
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [initialTime, setInitialTime] = useState<number>(25 * 60); // 전체 설정된 시간 (초)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 캔버스 및 꽃가루 물리 엔진 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<{ x: number; y: number; size: number; color: string; speedX: number; speedY: number; rotation: number; rotationSpeed: number }[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // 격려 팝업 상태
  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsMsg, setCongratsMsg] = useState("");

  // ✍️ 손글씨/태블릿 펜 드로잉 메모 기능 상태 및 Ref
  const [memoMode, setMemoMode] = useState<"text" | "sketch">("text");
  const [brushColor, setBrushColor] = useState<string>("#0f172a"); // 기본 펜: 숯검은색
  const sketchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const ENCOURAGING_MESSAGES = [
    "오늘도 정말 수고했어요! 한 장의 멋진 캔버스를 가득 채웠네요! 🎨✨ 나 자신을 칭찬해 주세요.",
    "몰입의 시간이 차곡차곡 쌓여 대학 합격의 빛나는 지도가 될 거예요! 🌟💪",
    "끝까지 집중을 완수한 당신은 이미 진정한 승리자입니다! 오늘도 값진 한 걸음을 전진했습니다! 🚀💯",
    "이 엄청난 몰입력이라면 목표하는 대학의 입시문도 활짝 열릴 거예요! 🔥🎓",
    "지치지 않고 묵묵히 나아가는 당신의 뜨거운 열정을 진심으로 응원합니다! 🌸🎨"
  ];

  // 꽃가루 물리 효과 시뮬레이터 구동
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f43f5e", "#3b82f6", "#10b981", "#eab308", "#8b5cf6", "#ec4899", "#f97316"];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height - 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.random() * 4 - 2,
      speedY: Math.random() * 5 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
    }));

    confettiRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      confettiRef.current.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 20) {
          alive = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animate();
  };

  // 컴포넌트 해제 시 애니메이션 루프 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

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

      // 피드백 데이터 로딩
      const savedFeedback = localStorage.getItem(`pomodoro_feedback_${dateKey}`);
      setFeedback(savedFeedback || "");

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

    // 격려 메시지 랜덤 추출 및 팝업 기동
    const randomMsg = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
    setCongratsMsg(randomMsg);
    setShowCongrats(true);

    // 꽃가루 모션 기동
    setTimeout(() => {
      triggerConfetti();
    }, 100);

    // 다음 대기 태스크 선택 자동화
    const nextPending = updated.find((t) => t.status === "pending" && t.id !== activeTaskId);
    if (nextPending) {
      setActiveTaskId(nextPending.id);
      setTimeLeft(nextPending.targetMinutes * 60);
      setInitialTime(nextPending.targetMinutes * 60);
    } else {
      setTimeLeft(0);
    }

    // 2단계 가드라인 오디오 재생 시스템 (1순위: 자연스러운 박수소리 재생 시도, 2순위: 맑은 비프음 합성)
    playCompleteSound();
  };

  const playCompleteSound = () => {
    if (typeof window === "undefined") return;
    try {
      // 1순위: 자연스럽고 풍부한 박수 소리 시도
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-500.wav");
      audio.volume = 0.45;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay or audio load failed, fallback to premium synth chime:", err);
          // 2순위: 코덱 미지원, 브라우저 오토플레이 차단, 오프라인 시 Web Audio API 기반의 영롱한 축하 화음 합성 재생
          playSynthesizedChime();
        });
      }
    } catch (e) {
      playSynthesizedChime();
    }
  };

  const playSynthesizedChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // 따뜻하고 영롱한 도파민 화음 (도-미-솔-도: C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50]; 
      
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // 부드럽고 영롱한 사인파 사용
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.08); // 영롱하게 르바토로 딜레이를 주어 아르페지오 느낌 구현
        
        gainNode.gain.setValueAtTime(0, now + index * 0.08);
        gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.6);
        
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.65);
      });
    } catch (e) {
      console.warn("Web Audio API synth chime failed:", e);
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
  
  // 피드백 메모 실시간 자동 저장
  const handleFeedbackChange = (val: string) => {
    setFeedback(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`pomodoro_feedback_${dateKey}`, val);
    }
  };

  // 스케치 이미지 로딩 및 그리기 함수
  const loadSavedSketch = () => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 실제 크기 구하기
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 캔버스 크기(물리 픽셀) 조정으로 레티나 디스플레이 등에서 선명하게 나오도록 처리
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr; // 고정 높이 180px
    ctx.scale(dpr, dpr);

    // 기본 스타일 세팅
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 저장된 이미지 불러와 그리기
    const savedImg = localStorage.getItem(`pomodoro_sketch_${dateKey}`);
    if (savedImg) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 180);
      };
      img.src = savedImg;
    } else {
      ctx.clearRect(0, 0, rect.width, 180);
    }
  };

  // 스케치 모드가 켜지거나 날짜가 바뀔 때 드로잉을 로드
  useEffect(() => {
    if (memoMode === "sketch") {
      const handle = requestAnimationFrame(() => {
        loadSavedSketch();
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [memoMode, dateKey]);

  // 포인터 드로잉 이벤트 핸들러 (태블릿 펜, 터치, 마우스 완전 통합 대응)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 터치 스크롤이나 바깥 마우스 끌림 이벤트를 방지하고 캔버스에 포커스 캡처
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    lastPosRef.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // 펜 스타일 설정
    if (brushColor === "eraser") {
      // 투명으로 지우기 (지우개 구현)
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 18;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 2.5;
    }
    
    // 포인터가 다운되었을 때 미세하게 그리기
    ctx.lineTo(x + 0.1, y);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPosRef.current = { x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(e.pointerId);

    // 그린 내용 base64 포맷으로 로컬스토리지에 저장
    const dataUrl = canvas.toDataURL();
    localStorage.setItem(`pomodoro_sketch_${dateKey}`, dataUrl);
  };

  const handleClearSketch = () => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem(`pomodoro_sketch_${dateKey}`);
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

  // SVG 원형 프로그레스 계산 (굵고 선명한 원형 면적으로 직관성 극대화)
  const radius = 160;
  const stroke = 28;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = initialTime > 0 
    ? circumference - (timeLeft / initialTime) * circumference 
    : 0;

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 좌측: 타이머 패널 (Glassmorphism & Neon Glow) */}
      <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-blue-500/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-indigo-950/90 p-8 shadow-xl text-white relative overflow-hidden min-h-[30rem]">
        
        {/* 장식용 그리드 배경 및 오라 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">

          {/* 원형 시각적 타이머 게이지 (더 넓은 면적) */}
          <div className="relative flex items-center justify-center my-6">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="transform -rotate-90 drop-shadow-[0_0_20px_rgba(99,102,241,0.25)]"
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

            {/* 타이머 내부 정밀 세련된 정보 집약 공간 */}
            <div className="absolute flex flex-col items-center justify-center text-center px-4 w-full h-full pointer-events-none">
              {/* 시계 그래픽 */}
              <Clock className="size-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)] mb-2" />
              
              {/* 감소하는 시간 */}
              <span className={cn(
                "text-5xl font-black tracking-tighter tabular-nums font-mono transition-all duration-300",
                isRunning ? "text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse" : "text-white"
              )}>
                {formatTime(timeLeft)}
              </span>

              {/* 현재 집중 중인 목표 이름 */}
              <p className="text-base font-extrabold text-slate-100 mt-3 truncate max-w-[210px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {activeTask ? activeTask.title : "목표를 추가해 보세요"}
              </p>
            </div>
          </div>

          {/* 컨트롤러 버튼 (재생, 리셋, 완료) */}
          <div className="flex items-center gap-5 mt-6 w-full justify-center">
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

        {/* 🎨 오늘의 크리틱 & 학습 피드백 노트 */}
        <div className="rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-50/20 to-orange-50/10 dark:from-amber-950/5 dark:to-orange-950/5 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Palette className="size-4 text-amber-500" />
              오늘의 크리틱 & 오답 메모
            </h3>
            
            {/* 텍스트/그림 그리기 토글 탭 */}
            <div className="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setMemoMode("text")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                  memoMode === "text"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Type className="size-3" />
                텍스트
              </button>
              <button
                type="button"
                onClick={() => setMemoMode("sketch")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                  memoMode === "sketch"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Pen className="size-3" />
                손글씨/펜
              </button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            {memoMode === "text" 
              ? "🎨 학원에서 들은 실기 크리틱, 지적 사항, 또는 틀린 문제 원인 등을 자유롭게 적어두고 상시 리마인드하세요! (자동 저장)"
              : "✍️ 태블릿 펜이나 터치로 크리틱 피드백, 드로잉 구도, 형태 수정을 자유롭게 직접 메모하세요! (날짜별 자동 저장)"}
          </p>

          {memoMode === "text" ? (
            <textarea
              value={feedback}
              onChange={(e) => handleFeedbackChange(e.target.value)}
              placeholder="예:&#13;1. 인체 동세 잡을 때 어깨 축 꺾임 주의할 것&#13;2. 형태 스케치 후 외곽 라인 강약 주기&#13;3. 수학 오답 - 22번 계산 과정 실수 방지!"
              rows={4}
              className="w-full text-xs p-3 rounded-xl border border-border bg-card/60 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 resize-none font-sans leading-relaxed shadow-inner"
            />
          ) : (
            <div className="space-y-2">
              {/* 스케치 도구 바 */}
              <div className="flex items-center justify-between bg-card/60 p-1.5 rounded-xl border border-border/80">
                <div className="flex items-center gap-1.5">
                  {[
                    { color: "#ef4444", name: "빨강 피드백" },
                    { color: "#f59e0b", name: "주황 하이라이트" },
                    { color: "#3b82f6", name: "파랑 노트" },
                    { color: "#0f172a", name: "연필 드로잉" },
                    { color: "eraser", name: "지우개" }
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setBrushColor(item.color)}
                      className={cn(
                        "size-6 rounded-full flex items-center justify-center border transition-all active:scale-95",
                        item.color === "eraser"
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300"
                          : "",
                        brushColor === item.color
                          ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 scale-110"
                          : "border-transparent"
                      )}
                      style={item.color !== "eraser" ? { backgroundColor: item.color } : {}}
                      title={item.name}
                    >
                      {item.color === "eraser" && <Eraser className="size-3" />}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleClearSketch}
                  className="text-[10px] px-2 h-6 rounded-lg text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
                >
                  <RotateCcw className="size-3 mr-1" />
                  지우기
                </Button>
              </div>

              {/* 펜 캔버스 드로잉보드 */}
              <div className="relative border border-border bg-white rounded-xl overflow-hidden h-[180px] shadow-inner cursor-crosshair">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-80" />
                <canvas
                  ref={sketchCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full touch-none"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 백그라운드 가속 꽃가루 캔버스 */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      />

      {/* 🎉 집중 성공 축하 & 입시 격려 모달 */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 p-6 shadow-2xl text-center text-white overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* 장식 광채 오라 */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg shadow-orange-500/20 mb-4 animate-bounce">
                👏
              </div>
              <h3 className="text-xl font-extrabold text-amber-400 tracking-tight">
                집중 목표 달성 성공!
              </h3>
              <p className="text-sm font-semibold text-slate-200 mt-2">
                &quot;{activeTask ? activeTask.title : "집중 목표"}&quot; 달성 완료
              </p>

              <div className="w-full h-px bg-slate-850 my-4" />

              <p className="text-sm text-slate-200 font-medium leading-relaxed px-2 py-1 italic">
                &ldquo;{congratsMsg}&rdquo;
              </p>

              <Button
                type="button"
                onClick={() => setShowCongrats(false)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md transition-all shadow-orange-500/10"
              >
                고마워요! 다음 집중 준비하기 🎨
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
