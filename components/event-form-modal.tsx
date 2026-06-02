"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDefaultFormTimes,
  localDatetimeToISO,
  toDatetimeLocalValue,
} from "@/lib/events/datetime";
import type { UserRole } from "@/types/auth";
import type { CalendarEvent, EventFormValues } from "@/types/event";
import type { Routine } from "@/types/routine";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  { label: "블랙", value: "#171717" },
  { label: "차콜", value: "#404040" },
  { label: "그레이", value: "#737373" },
  { label: "실버", value: "#a3a3a3" },
] as const;

const STUDENT_COLOR_PRESETS = [
  { label: "네이비", value: "#1e3a5f" },
  { label: "테라코타", value: "#9a3412" },
  { label: "올리브", value: "#3f6212" },
  { label: "플럼", value: "#581c87" },
] as const;

type EventFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
  selectedDate: Date | null;
  editingEvent: CalendarEvent | null;
  readOnly?: boolean;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (eventId: string) => void;
  routines?: Routine[];
  isCompleted?: (routineId: string, date: Date) => boolean;
  onToggleRoutine?: (routineId: string, date: Date) => void;
};

function getColorPresets(role: UserRole) {
  return role === "admin" ? COLOR_PRESETS : STUDENT_COLOR_PRESETS;
}

export function EventFormModal({
  open,
  onOpenChange,
  role,
  selectedDate,
  editingEvent,
  readOnly = false,
  onSaved,
  onDeleted,
  routines = [],
  isCompleted,
  onToggleRoutine,
}: EventFormModalProps) {
  const colorPresets = getColorPresets(role);
  const isEdit = Boolean(editingEvent);
  const isAdmin = role === "admin";

  const studentRoutines = role === "student" ? (routines ?? []) : [];
  const showRoutines = studentRoutines.length > 0 && selectedDate;
  
  const completedCount = showRoutines
    ? studentRoutines.filter((r) => isCompleted?.(r.id, selectedDate!)).length
    : 0;
  const progressPercent = showRoutines
    ? (completedCount / studentRoutines.length) * 100
    : 0;

  const [form, setForm] = useState<EventFormValues>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    color_code: colorPresets[0].value,
    is_major: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (editingEvent) {
      setForm({
        title: editingEvent.title,
        description: editingEvent.description ?? "",
        start_date: toDatetimeLocalValue(new Date(editingEvent.start_date)),
        end_date: toDatetimeLocalValue(new Date(editingEvent.end_date)),
        color_code: editingEvent.color_code,
        is_major: editingEvent.is_major ?? false,
      });
    } else if (selectedDate) {
      const { start, end } = buildDefaultFormTimes(selectedDate);
      setForm({
        title: "",
        description: "",
        start_date: start,
        end_date: end,
        color_code: colorPresets[0].value,
        is_major: false,
      });
    }

    setError(null);
  }, [open, selectedDate, editingEvent, colorPresets]);

  // 시각적 24시간 슬라이더 및 타임라인 계산용 헬퍼 함수
  const getYearMonthDay = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 10); // "YYYY-MM-DD"
  };

  const getHourAndMinute = (dateStr: string) => {
    if (!dateStr) return { hour: 9, minute: 0 };
    const timePart = dateStr.substring(11, 16); // "HH:mm"
    if (!timePart) return { hour: 9, minute: 0 };
    const [h, m] = timePart.split(":").map(Number);
    return { hour: h ?? 9, minute: m ?? 0 };
  };

  const startVal = getHourAndMinute(form.start_date);
  const endVal = getHourAndMinute(form.end_date);

  const startDecimal = startVal.hour + startVal.minute / 60;
  const endDecimal = endVal.hour + endVal.minute / 60;
  const durationHours = Math.max(0, endDecimal - startDecimal);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
  };

  const handleTimeChange = (type: "start" | "end", decimalValue: number) => {
    const totalMinutes = Math.round(decimalValue * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    
    const datePart = getYearMonthDay(type === "start" ? form.start_date : form.end_date);
    
    setForm((prev) => {
      const updatedStr = `${datePart}T${timeStr}`;
      if (type === "start") {
        // 종료 시각이 시작 시각보다 빠르면 밀어내기
        const currentEnd = getHourAndMinute(prev.end_date);
        const endDec = currentEnd.hour + currentEnd.minute / 60;
        let newEndDate = prev.end_date;
        if (endDec <= decimalValue) {
          const nextH = Math.min(24, Math.floor((totalMinutes + 30) / 60));
          const nextM = (totalMinutes + 30) % 60;
          const nextTimeStr = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
          newEndDate = `${getYearMonthDay(prev.end_date)}T${nextTimeStr}`;
        }
        return { ...prev, start_date: updatedStr, end_date: newEndDate };
      } else {
        // 시작 시각이 종료 시각보다 늦으면 당겨오기
        const currentStart = getHourAndMinute(prev.start_date);
        const startDec = currentStart.hour + currentStart.minute / 60;
        let newStartDate = prev.start_date;
        if (startDec >= decimalValue) {
          const prevH = Math.max(0, Math.floor((totalMinutes - 30) / 60));
          const prevM = Math.max(0, (totalMinutes - 30) % 60);
          const prevTimeStr = `${String(prevH).padStart(2, "0")}:${String(prevM).padStart(2, "0")}`;
          newStartDate = `${getYearMonthDay(prev.start_date)}T${prevTimeStr}`;
        }
        return { ...prev, end_date: updatedStr, start_date: newStartDate };
      }
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (readOnly) return;

    if (!form.title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_date: localDatetimeToISO(form.start_date),
      end_date: localDatetimeToISO(form.end_date),
      color_code: form.color_code,
      is_major: isAdmin ? form.is_major : false,
    };

    try {
      const response = await fetch(
        isEdit ? `/api/events/${editingEvent!.id}` : "/api/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as {
        event?: CalendarEvent;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "일정 저장에 실패했습니다.");
      }

      if (body.event) {
        onSaved(body.event);
      }

      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "일정 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || readOnly) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "일정 삭제에 실패했습니다.");
      }

      onDeleted(editingEvent.id);
      onOpenChange(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "일정 삭제에 실패했습니다.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const titleLabel = readOnly
    ? "일정 상세"
    : isEdit
      ? "일정 수정"
      : isAdmin
        ? "전역 입시 일정 등록"
        : "개인 일정 등록";

  const descriptionLabel = readOnly
    ? isAdmin
      ? "전역 입시 일정입니다."
      : "학원에서 등록한 전역 일정입니다. 수정할 수 없습니다."
    : isAdmin
      ? "모든 학생에게 표시되는 입시·전형 일정입니다."
      : "본인만 볼 수 있는 내신·실기 등 개인 일정입니다.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleLabel}</DialogTitle>
          <DialogDescription>{descriptionLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="event-title">제목</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={
                isAdmin ? "예: 홍익대 실기고사" : "예: 내신 기말 대비"
              }
              required
              disabled={readOnly}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-description">설명</Label>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="메모, 장소, 준비물 등"
              rows={3}
              disabled={readOnly}
            />
          </div>

          {/* 비주얼 타임 레인지 조절기 및 시간 그래픽 타임라인 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">시각적 시간 및 분량 설정</span>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                총 {formatDuration(durationHours)} 동안
              </span>
            </div>

            {/* 24시간 타임라인 가로 바 그래픽 */}
            <div className="relative pt-1">
              <div className="h-4 w-full rounded-md bg-muted/60 relative overflow-hidden border border-border/40">
                {/* 활성화 시간 영역 칠하기 (파란색 그라데이션) */}
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-85 transition-all duration-300"
                  style={{
                    left: `${(startDecimal / 24) * 100}%`,
                    width: `${(durationHours / 24) * 100}%`,
                  }}
                />
                
                {/* 1시간 단위 격자 구분선 */}
                {Array.from({ length: 23 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-full w-px bg-background/20"
                    style={{ left: `${((i + 1) / 24) * 100}%` }}
                  />
                ))}
              </div>

              {/* 시간 눈금 (0, 6, 12, 18, 24시) */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-0.5 font-medium">
                <span>00시</span>
                <span>06시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
            </div>

            {/* 간편 조절 슬라이더 슬롯 */}
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <Label htmlFor="range-start-slider">시작 시각</Label>
                  <span className="text-blue-500 font-bold">{String(startVal.hour).padStart(2, "0")}:{String(startVal.minute).padStart(2, "0")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="range-start-slider"
                    type="range"
                    min="0"
                    max="23.5"
                    step="0.5"
                    value={startDecimal}
                    disabled={readOnly}
                    onChange={(e) => handleTimeChange("start", parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <Label htmlFor="range-end-slider">종료 시각</Label>
                  <span className="text-indigo-500 font-bold">{String(endVal.hour).padStart(2, "0")}:{String(endVal.minute).padStart(2, "0")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="range-end-slider"
                    type="range"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={endDecimal}
                    disabled={readOnly}
                    onChange={(e) => handleTimeChange("end", parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 수동 정밀 조작 및 날짜 변경을 위한 세부 설정 아코디언 */}
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
                날짜 및 정밀 시각 직접 입력하기 (클릭)
              </summary>
              <div className="grid gap-3 sm:grid-cols-2 mt-2 pt-2 border-t border-border/30">
                <div className="grid gap-1">
                  <Label htmlFor="event-start" className="text-[10px]">시작 날짜/시각</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                    required
                    disabled={readOnly}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="event-end" className="text-[10px]">종료 날짜/시각</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    required
                    disabled={readOnly}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </details>
          </div>

          {isAdmin && !readOnly && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={form.is_major}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    is_major: checked === true,
                  }))
                }
              />
              주요 일정 (24시간 전 리마인더 메일 대상)
            </label>
          )}

          {!readOnly && (
            <div className="grid gap-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    aria-label={preset.label}
                    aria-pressed={form.color_code === preset.value}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        color_code: preset.value,
                      }))
                    }
                    className="size-8 rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: preset.value,
                      borderColor:
                        form.color_code === preset.value
                          ? "var(--foreground)"
                          : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {showRoutines && selectedDate && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 dark:border-emerald-500/10 dark:bg-emerald-950/5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-emerald-850 dark:text-emerald-400">
                    오늘의 3대 입시 루틴
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedDate.toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {completedCount} / {studentRoutines.length} 달성
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid gap-2">
                {studentRoutines.map((routine) => {
                  const done = isCompleted?.(routine.id, selectedDate) ?? false;
                  return (
                    <button
                      key={routine.id}
                      type="button"
                      onClick={() => onToggleRoutine?.(routine.id, selectedDate)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg border p-2.5 text-left text-sm transition-all duration-300",
                        "hover:scale-[1.01] active:scale-[0.99]",
                        done
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-100"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className={cn(
                        "flex size-7 items-center justify-center rounded-full text-base transition-transform duration-300",
                        done ? "bg-emerald-500/20 scale-110" : "bg-muted"
                      )}>
                        {routine.emoji}
                      </span>
                      <span className={cn(
                        "flex-1 font-medium transition-all duration-300",
                        done ? "line-through text-emerald-800/60 dark:text-emerald-300/60" : "text-foreground"
                      )}>
                        {routine.title}
                      </span>
                      <div className={cn(
                        "flex size-5 items-center justify-center rounded-md border transition-all duration-300",
                        done 
                          ? "border-emerald-500 bg-emerald-500 text-primary-foreground" 
                          : "border-muted-foreground/30 bg-transparent"
                      )}>
                        {done && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit && !readOnly ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
              >
                {isDeleting ? "삭제 중…" : "삭제"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
              >
                {readOnly ? "닫기" : "취소"}
              </Button>
              {!readOnly && (
                <Button type="submit" disabled={isSaving || isDeleting}>
                  {isSaving ? "저장 중…" : "저장"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
