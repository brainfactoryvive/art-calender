"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StudentCalendarShell } from "@/components/student-calendar-shell";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { role, setOverrideRole, signOut } = useAuth();
  const [showCalendar, setShowCalendar] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Handle eye tracking mouse movements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById("interactive-logo-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Calculate a comfortable, natural movement range (max 6px of shift)
      const maxDistance = 6;
      const distance = Math.min(maxDistance, Math.hypot(dx, dy) / 40);

      setEyeOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleEnterCalendar = (selectedRole: "student" | "admin") => {
    setOverrideRole(selectedRole);
    setShowCalendar(true);
  };

  if (showCalendar && role) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-background">
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="relative size-8 overflow-hidden rounded-md bg-zinc-950 flex items-center justify-center p-1">
                <Image
                  src="/logo.png"
                  alt="Brain Factory Logo"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-semibold tracking-wider text-sm text-foreground uppercase">
                BRAINFACTORY ACADEMY
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCalendar(false)}
              >
                소개 페이지로
              </Button>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                {role === "admin" ? "관리자 모드" : "학생 모드"}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <StudentCalendarShell />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11110f] text-[#f4efe9] selection:bg-[#c68b59]/30 selection:text-[#f4efe9] font-sans antialiased overflow-x-hidden">
      {/* Grid Overlay background matching premium aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#966f33]/10 via-[#c68b59]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#f4efe9]/10 bg-[#11110f]/80 backdrop-blur-md sticky top-0">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="relative size-11 overflow-hidden rounded-lg bg-black flex items-center justify-center p-0.5 shadow-lg border border-[#f4efe9]/10">
              <Image
                src="/logo.png"
                alt="Brain Factory Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold tracking-widest text-base block text-[#f4efe9] uppercase">
                BRAINFACTORY ACADEMY
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#966f33] font-medium block uppercase -mt-0.5">
                Design Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {role ? (
              <>
                <button
                  onClick={() => signOut()}
                  className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#f4efe9]/20 hover:border-[#c68b59] hover:bg-[#c68b59]/10 transition-all duration-300"
                >
                  로그아웃
                </button>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-[#c68b59] text-[#11110f] hover:bg-[#b07a50] transition-all duration-300 shadow-md shadow-[#c68b59]/10"
                >
                  캘린더로 이동
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#f4efe9]/20 hover:border-[#c68b59] hover:bg-[#c68b59]/10 transition-all duration-300"
                >
                  회원가입
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-[#c68b59] text-[#11110f] hover:bg-[#b07a50] transition-all duration-300 shadow-md shadow-[#c68b59]/10"
                >
                  관리자 모드
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section (First Page) - Interactive 1.5x Large Logo with eye movement */}
      <section className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6">
        <div 
          id="interactive-logo-container"
          className="relative w-96 h-96 sm:w-[480px] sm:h-[480px] md:w-[540px] md:h-[540px] rounded-full overflow-hidden shadow-2xl bg-black flex items-center justify-center group"
        >
          {/* Base Layer: Face with NO eyes (Perfect circular cropping) */}
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <Image
              src="/logo_no_eyes.png"
              alt="Brain Factory Logo Background"
              fill
              className="object-contain rounded-full"
              priority
            />

            {/* Moving Layer: Eyes Only (Exact overlay alignment shifting based on mousePos) */}
            <div 
              className="absolute inset-0 transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
              }}
            >
              <Image
                src="/eyes_only.png"
                alt="Brain Factory Logo Eyes"
                fill
                className="object-contain rounded-full"
                priority
              />
            </div>
          </div>
          
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#c68b59]/5 to-transparent pointer-events-none opacity-50" />
        </div>
      </section>

      {/* Feature Bento Grid (Second Page) */}
      <section className="relative z-10 py-16 sm:py-24 border-t border-[#f4efe9]/10 bg-[#161613]">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-[#f4efe9] mb-4">
              오직 미대 입시생을 위해 맞춤 설계된 4가지 혁신
            </h2>
            <p className="text-sm sm:text-base text-[#f4efe9]/60">
              브레인팩토리 아카데미만의 전문적인 관리 방식을 온라인 플래너에 완벽하게 녹여내어, 무너지기 쉬운 입시 리듬을 견고하게 지켜줍니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-[#f4efe9]/5 bg-[#11110f] p-8 hover:border-[#c68b59]/40 hover:translate-y-[-4px] transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#e6d5c3]/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                📅
              </div>
              <h3 className="text-lg font-bold text-[#f4efe9] mb-3">연간 입시 일정 통합</h3>
              <p className="text-xs text-[#f4efe9]/60 leading-relaxed">
                복잡한 전형일정,실기고사, 합격 발표를 일목요연하게 파악하고, 회원가입으로 개인일정을 추가할수 있는 캘린터 시스템을 탑재했습니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-[#f4efe9]/5 bg-[#11110f] p-8 hover:border-[#c68b59]/40 hover:translate-y-[-4px] transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#d2b48c]/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                🎯
              </div>
              <h3 className="text-lg font-bold text-[#f4efe9] mb-3">하루 3대 입시 루틴</h3>
              <p className="text-xs text-[#f4efe9]/60 leading-relaxed">
                드로잉, 오답 분석, 학업 등 미대 입시 성공의 핵심이 되는 하루 3가지 필수 루틴을 커스텀 정의하고 트래킹합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-[#f4efe9]/5 bg-[#11110f] p-8 hover:border-[#c68b59]/40 hover:translate-y-[-4px] transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#966f33]/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                ⏱️
              </div>
              <h3 className="text-lg font-bold text-[#f4efe9] mb-3">뽀모도로 학습 타이머</h3>
              <p className="text-xs text-[#f4efe9]/60 leading-relaxed">
                실기 집중력과 학업 몰입도를 극대화할 수 있도록 일간 일정 뷰에 뽀모도로 인터렉티브 시계를 전면 배치했습니다.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-[#f4efe9]/5 bg-[#11110f] p-8 hover:border-[#c68b59]/40 hover:translate-y-[-4px] transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#5c3a21]/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                🔔
              </div>
              <h3 className="text-lg font-bold text-[#f4efe9] mb-3">자동 이중 리마인더</h3>
              <p className="text-xs text-[#f4efe9]/60 leading-relaxed">
                학원에서 등록한 중요 입시 일정은 3일 전 및 24시간 전에 학생 메일로 자동 이중 통보되어 놓치는 실수를 미연에 방지합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guide Section (Third Page) */}
      <section className="relative z-10 py-20 sm:py-28 bg-[#11110f]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-bold text-[#c68b59] uppercase tracking-widest block mb-3">HOW TO USE</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-[#f4efe9] mb-6">
                브레인팩토리 <br />
                입시 캘린더 활용 가이드
              </h2>
              <p className="text-sm text-[#f4efe9]/70 leading-relaxed mb-8">
                단순히 보기만 하는 달력이 아닙니다. 학원과 학생이 정합성 있게 이어져, 오직 미대 합격이라는 하나의 명료한 골라인을 향해 매일의 실기 습관을 축적해 나갑니다.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#c68b59]/20 text-xs font-bold text-[#c68b59]">1</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#f4efe9] mb-1">학원 연간 일정 체크</h4>
                    <p className="text-xs text-[#f4efe9]/60 leading-relaxed">관리자 모드에서 자동 수집 및 AI 등록한 학원 연간 및 대학 전형 일정이 옅은 색상의 아름다운 배경 바(Bar)로 상시 렌더링됩니다.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#c68b59]/20 text-xs font-bold text-[#c68b59]">2</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#f4efe9] mb-1">나만의 개인 일정 및 루틴 커스텀</h4>
                    <p className="text-xs text-[#f4efe9]/60 leading-relaxed">학생들은 원하는 날짜 셀을 직접 클릭해 수능 모의고사나 내신 대비 등 독자 일정을 추가하고, 일일 3대 필수 루틴을 세팅합니다.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#c68b59]/20 text-xs font-bold text-[#c68b59]">3</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#f4efe9] mb-1">뽀모도로와 함께하는 깊은 몰입</h4>
                    <p className="text-xs text-[#f4efe9]/60 leading-relaxed">일간 일정 뷰에 장착된 뽀모도로 시계와 타이머 기능을 통하여 당일 정해둔 드로잉 목표량을 최고의 집중력으로 완수해냅니다.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated UI Card / Instagram Premium Mockup */}
            <div className="relative rounded-2xl border border-[#f4efe9]/10 bg-[#161613] p-6 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#966f33]/10 to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
              <div className="relative z-10">
                {/* Simulated header */}
                <div className="flex items-center justify-between border-b border-[#f4efe9]/5 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500/60" />
                    <span className="size-2.5 rounded-full bg-yellow-500/60" />
                    <span className="size-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[10px] text-[#f4efe9]/40 tracking-wider font-mono">brainfactory.artcalendar</span>
                </div>

                {/* Simulated UI calendar item */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#c68b59]/30 bg-[#c68b59]/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#c68b59]">ANNUAL SCHEDULE</span>
                      <span className="text-xs font-serif font-semibold text-[#f4efe9]">D-3</span>
                    </div>
                    <h4 className="font-bold text-[#f4efe9] text-sm">홍익대 입시 미술 실기고사</h4>
                    <p className="text-[11px] text-[#f4efe9]/50 mt-1">2026.10.15 - 10.17 | 대강당 고사장</p>
                  </div>

                  <div className="rounded-xl border border-[#f4efe9]/5 bg-[#11110f] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">STUDENT ROUTINE</span>
                      <span className="text-[10px] font-bold text-[#c68b59]">2 / 3 COMPLETED</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-[#f4efe9]/70 line-through decoration-zinc-600">
                        <span className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px]">✓</span>
                        매일 인체 크로키 10분 완료
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-[#f4efe9]/70 line-through decoration-zinc-600">
                        <span className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px]">✓</span>
                        디자인 아이디어 스케치 1점
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-[#f4efe9]/80 font-semibold">
                        <span className="size-4.5 rounded border border-[#f4efe9]/20 flex items-center justify-center text-[10px]"> </span>
                        미술사 단어 20개 복습
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#f4efe9]/5 bg-[#11110f] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="size-8 rounded-full bg-red-500/10 flex items-center justify-center text-sm">⏱️</span>
                      <div>
                        <h5 className="text-xs font-bold text-[#f4efe9]">뽀모도로 몰입 타이머</h5>
                        <p className="text-[10px] text-[#f4efe9]/50">최종 누적 집중 시간: 2시간 45분</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-[#c68b59]">25:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#f4efe9]/10 bg-[#0d0d0c] py-12 text-center text-[#f4efe9]/40 text-xs">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative size-14 overflow-hidden rounded-xl bg-black flex items-center justify-center p-0.5 mx-auto mb-4 border border-[#f4efe9]/10">
            <Image
              src="/logo.png"
              alt="Brain Factory Footer Logo"
              width={50}
              height={50}
              className="object-contain"
            />
          </div>
          <p className="font-serif tracking-widest text-[#f4efe9]/60 font-black mb-2 uppercase text-sm">
            BRAIN FACTORY ACADEMY
          </p>
          <p className="max-w-md mx-auto leading-relaxed text-[11px] mb-6 text-[#f4efe9]/30">
            고도의 영감과 완벽한 시스템이 만나는 공간. <br />
            브레인팩토리 아카데미와 함께 가장 빛나는 합격의 순간을 완성하세요.
          </p>
          <div className="h-px w-16 bg-[#f4efe9]/10 mx-auto mb-6" />
          <p>© 2026 Brain Factory. All rights reserved. Designed for Premium Admission Experience.</p>
        </div>
      </footer>
    </div>
  );
}
