"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

import { RoutineGuidelines } from "@/components/routine-guidelines";
import { Button } from "@/components/ui/button";
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
import { ROUTINE_SLOTS, type Routine, type RoutineDraft } from "@/types/routine";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">
      이모지 피커 로딩 중…
    </div>
  ),
});

type RoutineSetupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (routines: Routine[]) => void;
};

const DEFAULT_DRAFTS: RoutineDraft[] = ROUTINE_SLOTS.map((slot) => ({
  slot,
  emoji: slot === 1 ? "🚶" : slot === 2 ? "📋" : "✏️",
  title: "",
}));

export function RoutineSetupModal({
  open,
  onOpenChange,
  onCompleted,
}: RoutineSetupModalProps) {
  const [drafts, setDrafts] = useState<RoutineDraft[]>(DEFAULT_DRAFTS);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDrafts(DEFAULT_DRAFTS);
    setActiveSlot(1);
    setError(null);
  }, [open]);

  const handleEmojiClick = (data: EmojiClickData) => {
    setDrafts((prev) =>
      prev.map((item) =>
        item.slot === activeSlot ? { ...item, emoji: data.emoji } : item,
      ),
    );
  };

  const handleSave = async () => {
    if (drafts.some((item) => !item.title.trim())) {
      setError("3가지 루틴의 제목을 모두 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routines: drafts }),
      });

      const payload = (await response.json()) as {
        routines?: Routine[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "루틴 저장에 실패했습니다.");
      }

      onCompleted(payload.routines ?? []);
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "루틴 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>매일 해야 하는 일 3가지</DialogTitle>
          <DialogDescription>
            노션처럼 이모지와 행동 문장으로 루틴을 등록하세요. 캘린더 날짜
            아래에서 매일 체크할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <RoutineGuidelines />

        <p className="text-xs text-muted-foreground">
          규칙 1: 2가지 이하의 행동 프로세스일 것. 규칙 2: 다짐이 아닌 명확한
          행동 위주여야 함.
        </p>

        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.slot}
              className={cn(
                "rounded-lg border p-3 transition-all",
                activeSlot === draft.slot
                  ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border text-lg transition-all",
                    activeSlot === draft.slot
                      ? "border-blue-500 bg-background shadow-sm ring-2 ring-blue-500/10"
                      : "border-border bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => setActiveSlot(draft.slot)}
                  aria-label={`루틴 ${draft.slot} 이모지 선택`}
                >
                  {draft.emoji}
                </button>
                <div className="flex-1">
                  <Label 
                    htmlFor={`routine-title-${draft.slot}`}
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      activeSlot === draft.slot ? "text-blue-500" : "text-muted-foreground"
                    )}
                  >
                    루틴 {draft.slot} {activeSlot === draft.slot && "✍️ (이모지 선택 중)"}
                  </Label>
                  <Input
                    id={`routine-title-${draft.slot}`}
                    value={draft.title}
                    onFocus={() => setActiveSlot(draft.slot)}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((item) =>
                          item.slot === draft.slot
                            ? { ...item, title: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder={
                      draft.slot === 1
                        ? "하루 30분 이내로 주변 소리를 들으며 걷는다"
                        : draft.slot === 2
                          ? "하루를 마감할 때 스케줄표를 보고 체크한다"
                          : "스케치북에 당일 연습 내용을 1줄 적는다"
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {activeSlot && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                루틴 {activeSlot} 이모지 선택
              </p>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.LIGHT}
                width="100%"
                height={320}
                searchPlaceHolder="이모지 검색"
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "저장 중…" : "루틴 저장하고 캘린더 시작"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
