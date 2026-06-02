"use client";

import { useCallback, useRef, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type {
  CalendarApi,
  DayCellContentArg,
  DatesSetArg,
  EventClickArg,
} from "@fullcalendar/core";
import interactionPlugin, {
  type DateClickArg,
} from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import koLocale from "@fullcalendar/core/locales/ko";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Link from "next/link";
import { EventFormModal } from "@/components/event-form-modal";
import { DailyPomodoro } from "@/components/daily-pomodoro";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  canCreateOnDateClick,
  canEditEvent,
} from "@/lib/auth/permissions";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useRoutineCellMount } from "@/hooks/use-routine-cell-mount";
import { useRoutineLogs } from "@/hooks/use-routine-logs";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import type { CalendarViewType } from "@/types/calendar";
import type { CalendarEvent } from "@/types/event";
import type { Routine } from "@/types/routine";

import "@/app/fullcalendar.css";

export type { CalendarViewType };

const VIEW_OPTIONS: { id: CalendarViewType; label: string }[] = [
  { id: "multiMonthYear", label: "연간" },
  { id: "dayGridMonth", label: "월간" },
  { id: "timeGridWeek", label: "주간" },
  { id: "timeGridDay", label: "일간" },
];

const DRILL_DOWN_VIEWS: CalendarViewType[] = [
  "multiMonthYear",
  "dayGridMonth",
];

const DAY_NUMBER_ONLY_VIEWS: CalendarViewType[] = [
  "multiMonthYear",
  "dayGridMonth",
];

function renderDayCellContent(arg: DayCellContentArg) {
  if (DAY_NUMBER_ONLY_VIEWS.includes(arg.view.type as CalendarViewType)) {
    return { html: String(arg.date.getDate()) };
  }
}

const VIEW_TRANSITION_MS = 280;

function formatTitle(api: CalendarApi): string {
  const view = api.view;
  const start = view.currentStart;

  if (view.type === "multiMonthYear") {
    return `${start.getFullYear()}년`;
  }

  if (view.type === "dayGridMonth") {
    return start.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
  }

  if (view.type === "timeGridWeek") {
    const end = new Date(view.currentEnd.getTime() - 1);
    const startLabel = start.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
    const endLabel = end.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
    });
    return `${startLabel} – ${endLabel}`;
  }

  return start.toLocaleDateString("ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function roleLabel(role: UserRole): string {
  return role === "admin" ? "관리자" : "학생";
}

type ArtCalendarProps = {
  routines?: Routine[];
  routinesEnabled?: boolean;
};

export function ArtCalendar({
  routines = [],
  routinesEnabled = false,
}: ArtCalendarProps) {
  const { session, role, dbRole, signOut, isLoading: isAuthLoading, setOverrideRole } = useAuth();

  const calendarRef = useRef<FullCalendar>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const academicYearStartDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0이 1월, 1이 2월
    if (month === 0) {
      return `${year - 1}-02-01`;
    }
    return `${year}-02-01`;
  }, []);

  const [currentView, setCurrentView] =
    useState<CalendarViewType>("multiMonthYear");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);

  const userId = session?.user.id ?? null;

  const {
    calendarEvents,
    isLoading,
    error,
    upsertEvent,
    removeEvent,
  } = useCalendarEvents({
    rangeStart,
    rangeEnd,
    role,
    userId,
  });

  const { logs, isCompleted, toggleLog } = useRoutineLogs({
    enabled: routinesEnabled,
    rangeStart,
    rangeEnd,
  });

  const currentMonthInfo = useMemo(() => {
    if (currentView !== "dayGridMonth" || !calendarRef.current || logs.length === 0) return null;
    const api = calendarRef.current.getApi();
    const currentStart = api.view.currentStart;
    if (!currentStart) return null;

    const year = currentStart.getFullYear();
    const month = currentStart.getMonth();

    // 이달의 총 일수
    const totalDays = new Date(year, month + 1, 0).getDate();

    // "YYYY-MM" 형식의 접두어
    const pad = (n: number) => String(n).padStart(2, "0");
    const prefix = `${year}-${pad(month + 1)}`;

    // 이달에 완료된(completed: true) 루틴 로그 필터링
    const thisMonthLogs = logs.filter(
      (log) => log.log_date.startsWith(prefix) && log.completed
    );

    const completedCount = thisMonthLogs.length;
    const totalSlots = totalDays * 3; // 하루 3개씩 루틴
    const percentage = totalSlots > 0 ? (completedCount / totalSlots) * 100 : 0;

    return {
      month: month + 1,
      totalSlots,
      completedCount,
      percentage: parseFloat(percentage.toFixed(1)),
    };
  }, [currentView, logs, rangeStart, rangeEnd]);

  const {
    handleDayCellDidMount,
    handleDayCellWillUnmount,
    handleDayHeaderDidMount,
    handleDayHeaderWillUnmount,
  } = useRoutineCellMount({
    routines,
    enabled: routinesEnabled,
    isCompleted,
    onToggle: toggleLog,
  });

  const runViewTransition = useCallback(
    (applyChange: (api: CalendarApi) => void) => {
      const api = calendarRef.current?.getApi();
      if (!api) return;

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setIsTransitioning(true);

      transitionTimerRef.current = setTimeout(() => {
        applyChange(api);
        setTitle(formatTitle(api));
        setIsTransitioning(false);
        transitionTimerRef.current = null;
      }, VIEW_TRANSITION_MS / 2);
    },
    [],
  );

  const openCreateModal = useCallback((date: Date) => {
    setEditingEvent(null);
    setIsReadOnlyModal(false);
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  const openEventModal = useCallback(
    (event: CalendarEvent, readOnly: boolean) => {
      setEditingEvent(event);
      setIsReadOnlyModal(readOnly);
      setSelectedDate(new Date(event.start_date));
      setIsModalOpen(true);
    },
    [],
  );

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    setTitle(formatTitle(info.view.calendar));
    setCurrentView(info.view.type as CalendarViewType);
    setRangeStart(info.start);
    setRangeEnd(info.end);
    setCurrentDate(info.view.calendar.getDate());
  }, []);

  const handleViewChange = useCallback(
    (view: CalendarViewType) => {
      if (view === currentView) return;

      runViewTransition((api) => {
        api.changeView(view);
        setCurrentView(view);
      });
    },
    [currentView, runViewTransition],
  );

  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi().next();
  }, []);

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      if (info.jsEvent.defaultPrevented || !role) return;

      const target = info.jsEvent.target as HTMLElement | null;
      if (target?.closest(".fc-routine-markers")) return;

      if (canCreateOnDateClick(role)) {
        openCreateModal(info.date);
        return;
      }

      const viewType = info.view.type as CalendarViewType;
      if (!DRILL_DOWN_VIEWS.includes(viewType)) return;

      runViewTransition((calendarApi) => {
        calendarApi.changeView("timeGridDay", info.date);
        calendarApi.gotoDate(info.date);
        setCurrentView("timeGridDay");
      });
    },
    [role, openCreateModal, runViewTransition],
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if (!role || !userId) return;

      const calendarEvent = info.event.extendedProps
        .calendarEvent as CalendarEvent | undefined;

      if (!calendarEvent) return;

      const editable = canEditEvent(calendarEvent, role, userId);
      const readOnly =
        Boolean(info.event.extendedProps.isReadOnly) || !editable;

      openEventModal(calendarEvent, readOnly);
    },
    [role, userId, openEventModal],
  );

  const canDrillDown =
    role === "student" && DRILL_DOWN_VIEWS.includes(currentView);

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          캘린더를 사용하려면 Supabase 환경 변수를 설정해 주세요.
        </p>
        <Link href="/login" className={buttonVariants()}>
          로그인 화면 보기
        </Link>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
        세션을 확인하는 중…
      </div>
    );
  }

  if (!session || !role) {
    const handleLoginClick = async () => {
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch (e) {
          console.error("Signout error during login redirect", e);
        }
      }
      window.location.href = "/login";
    };

    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          로그인이 필요합니다.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={handleLoginClick}>
            로그인하기
          </Button>
          {process.env.NODE_ENV === "development" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverrideRole("student")}
            >
              개발용 샌드박스로 둘러보기
            </Button>
          )}
        </div>
      </div>
    );
  }


  return (
    <section className="art-calendar flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
            <CalendarDays className="size-4 text-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Art Admissions
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              입시 일정
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1 text-xs">
            <span className="pl-2 pr-1 font-medium text-foreground">
              {session.profile.display_name ?? session.user.email}
              {(process.env.NODE_ENV !== "development" && dbRole !== "admin") && (
                <span className="ml-1.5 rounded bg-foreground/10 px-1 py-0.5 text-[9px] text-muted-foreground font-semibold">
                  {role === "admin" ? "관리자" : "학생"}
                </span>
              )}
            </span>
            {(process.env.NODE_ENV === "development" || dbRole === "admin") && (
              <>
                <button
                  type="button"
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium transition-all text-[11px]",
                    role === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setOverrideRole("student")}
                >
                  학생
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium transition-all text-[11px]",
                    role === "admin"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setOverrideRole("admin")}
                >
                  관리자
                </button>
              </>
            )}
            <span className="h-4 w-px bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={signOut}
              aria-label="로그아웃"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>

          {role === "admin" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => openCreateModal(new Date())}
              className="gap-1 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              + 일정 추가
            </Button>
          )}

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handlePrev}
              aria-label="이전"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              오늘
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleNext}
              aria-label="다음"
            >
              <ChevronRight />
            </Button>
          </div>

          <p className="min-w-[10rem] px-2 text-center text-sm font-medium text-foreground sm:text-left">
            {title}
            {isLoading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                불러오는 중…
              </span>
            )}
          </p>

          <div
            className="flex rounded-lg border border-border bg-muted/40 p-0.5"
            role="tablist"
            aria-label="캘린더 보기"
          >
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={currentView === option.id}
                variant={currentView === option.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-md px-3",
                  currentView !== option.id &&
                    "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => handleViewChange(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {currentView === "timeGridDay" ? (
        <p className="text-xs text-muted-foreground">
          ⏱️ 뽀모도로 시계를 사용해 오늘 집중하고 성취할 목표를 한눈에 관리하세요.
        </p>
      ) : role === "admin" ? (
        <p className="text-xs text-muted-foreground">
          관리자: 날짜 클릭으로 전역 입시 일정을 등록·수정할 수 있습니다.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          학생: 옅은 배경의 전역 일정 위에 개인 일정을 겹쳐 표시합니다. 날짜
          클릭으로 개인 일정을 추가하세요.
          {canDrillDown &&
            " 연간·월간에서는 일간 보기 전환은 뷰 메뉴를 이용하세요."}
        </p>
      )}

      {currentView !== "timeGridDay" && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-border bg-[#e5e5e5]" />
            전역 일정 (읽기 전용)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-[#1e3a5f]" />
            개인 일정
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {role === "student" && currentView === "dayGridMonth" && routinesEnabled && currentMonthInfo && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-xl border border-blue-500/10 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/5 dark:to-indigo-950/5 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl shadow-inner">
              📈
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                {currentMonthInfo.month}월 루틴 달성 현황
              </p>
              <h3 className="text-sm font-bold text-foreground mt-0.5">
                하루 3개씩 총 {currentMonthInfo.totalSlots}번 중 <span className="text-blue-600 dark:text-blue-400 font-extrabold">{currentMonthInfo.completedCount}번</span> 성공!
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-1 max-w-[16rem] sm:justify-end">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${currentMonthInfo.percentage}%` }}
              />
            </div>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[3.5rem] text-right">
              {currentMonthInfo.percentage}%
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-[32rem] flex-1 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm transition-opacity duration-300 ease-in-out sm:p-4",
          isTransitioning && "opacity-40",
          currentView === "timeGridDay" && "p-4 sm:p-6"
        )}
      >
        {currentView === "timeGridDay" ? (
          <DailyPomodoro date={currentDate} />
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[
              multiMonthPlugin,
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
            ]}
            initialView="multiMonthYear"
            initialDate={academicYearStartDate}
            locale={koLocale}
            headerToolbar={false}
            height="auto"
            contentHeight="auto"
            expandRows
            stickyHeaderDates
            nowIndicator
            dayMaxEvents
            selectable={false}
            navLinks={false}
            events={calendarEvents}
            eventOrder="start,-duration,allDay,title"
            views={{
              multiMonthYear: {
                type: "multiMonth",
                duration: { months: 12 },
                multiMonthMaxColumns: 4,
                multiMonthMinWidth: 220,
              },
            }}
            dayCellClassNames={(arg) => {
              const classes: string[] = [];
              if (
                canCreateOnDateClick(role) ||
                DRILL_DOWN_VIEWS.includes(arg.view.type as CalendarViewType)
              ) {
                classes.push("fc-day-drillable");
              }

              // 연간 달력에서 당일 기준 지난 날들에 빨간색 라인 클래스 추가
              if (arg.view.type === "multiMonthYear") {
                const today = new Date();
                const compDate = new Date(arg.date.getFullYear(), arg.date.getMonth(), arg.date.getDate());
                const compToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                // 올해이고 오늘이거나 이전 날짜인 경우
                if (arg.date.getFullYear() === today.getFullYear() && compDate.getTime() <= compToday.getTime()) {
                  classes.push("fc-past-red-line");
                }
              }

              return classes;
            }}
            dayCellContent={renderDayCellContent}
            dayCellDidMount={handleDayCellDidMount}
            dayCellWillUnmount={handleDayCellWillUnmount}
            dayHeaderDidMount={handleDayHeaderDidMount}
            dayHeaderWillUnmount={handleDayHeaderWillUnmount}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
          />
        )}
      </div>

      <EventFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        role={role}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        readOnly={isReadOnlyModal}
        onSaved={upsertEvent}
        onDeleted={removeEvent}
        routines={role === "student" ? routines : []}
        isCompleted={isCompleted}
        onToggleRoutine={toggleLog}
      />
    </section>
  );
}
