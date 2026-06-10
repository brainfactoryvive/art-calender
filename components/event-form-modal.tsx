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
  { label: "밀크 베이지", value: "#e6d5c3" },
  { label: "라떼 브라운", value: "#d2b48c" },
  { label: "황토 브라운", value: "#c68b59" },
  { label: "시나몬 브라운", value: "#b07a50" },
  { label: "카멜 브라운", value: "#966f33" },
  { label: "테라코타 브라운", value: "#a65a32" },
  { label: "코코아 브라운", value: "#8b5a2b" },
  { label: "모카 브라운", value: "#704214" },
  { label: "에스프레소 브라운", value: "#5c3a21" },
  { label: "딥 브라운", value: "#3d2314" },
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
    reminder_24h: false,
    reminder_3d: false,
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
        reminder_24h: editingEvent.is_major ?? false,
        reminder_3d: editingEvent.is_major ?? false,
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
        reminder_24h: false,
        reminder_3d: false,
      });
    }

    setError(null);
  }, [open, selectedDate, editingEvent, colorPresets]);

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
      is_major: form.is_major,
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
    if (!editingEvent || (readOnly && !isAdmin)) return;

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
        ? "연간 입시 일정 등록"
        : "개인 일정 등록";

  const descriptionLabel = readOnly
    ? isAdmin
      ? "연간 입시 일정입니다."
      : "학원에서 등록한 연간 일정입니다. 수정할 수 없습니다."
    : isAdmin
      ? "모든 학생에게 표시되는 연간 입시·전형 일정입니다."
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

          {/* 기간 입력하기 영역 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <span className="text-xs font-bold text-muted-foreground block">📅 기간 입력하기</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="event-start" className="text-xs font-semibold">시작 날짜/시각</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                  required
                  disabled={readOnly}
                  className="h-9 text-xs bg-background border-border/80"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="event-end" className="text-xs font-semibold">종료 날짜/시각</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, end_date: e.target.value }))
                  }
                  required
                  disabled={readOnly}
                  className="h-9 text-xs bg-background border-border/80"
                />
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="grid gap-2 border-t border-border/30 pt-3">
              <Label className="text-xs font-bold text-muted-foreground">🔔 일정 리마인더 메일 설정</Label>
              <div className="flex flex-col gap-2.5 mt-1">
                <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    id="reminder-24h"
                    checked={form.reminder_24h}
                    onCheckedChange={(checked) =>
                      setForm((prev) => {
                        const next24h = checked === true;
                        return {
                          ...prev,
                          reminder_24h: next24h,
                          is_major: next24h || !!prev.reminder_3d,
                        };
                      })
                    }
                  />
                  <span>24시간 전 메일로 리마인더</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    id="reminder-3d"
                    checked={form.reminder_3d}
                    onCheckedChange={(checked) =>
                      setForm((prev) => {
                        const next3d = checked === true;
                        return {
                          ...prev,
                          reminder_3d: next3d,
                          is_major: !!prev.reminder_24h || next3d,
                        };
                      })
                    }
                  />
                  <span>3일전 메일로 리마인더</span>
                </label>
              </div>
            </div>
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
              {readOnly && isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSaving || isDeleting}
                >
                  {isDeleting ? "삭제 중…" : "일정 삭제하기"}
                </Button>
              )}
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
