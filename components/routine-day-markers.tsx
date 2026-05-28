"use client";

import { cn } from "@/lib/utils";
import type { Routine } from "@/types/routine";

type RoutineDayMarkersProps = {
  date: Date;
  routines: Routine[];
  isCompleted: (routineId: string, date: Date) => boolean;
  onToggle: (routineId: string, date: Date) => void;
};

export function RoutineDayMarkers({
  date,
  routines,
  isCompleted,
  onToggle,
}: RoutineDayMarkersProps) {
  if (routines.length === 0) return null;

  return (
    <div
      className="fc-routine-markers flex items-center justify-center gap-1.5 py-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {routines.map((routine) => {
        const done = isCompleted(routine.id, date);

        return (
          <button
            key={routine.id}
            type="button"
            title={routine.title}
            aria-label={`${routine.title} ${done ? "완료" : "미완료"}`}
            aria-pressed={done}
            className={cn(
              "relative inline-flex size-6.5 items-center justify-center rounded-full text-xs transition-all duration-300",
              "border border-border bg-card/60 shadow-xs hover:scale-110 active:scale-95",
              done
                ? "border-emerald-500/40 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100"
                : "hover:border-muted-foreground/30 hover:bg-muted/40"
            )}
            onClick={() => onToggle(routine.id, date)}
          >
            <span className={cn(
              "transition-opacity duration-200",
              done ? "opacity-100" : "opacity-80 hover:opacity-100"
            )}>
              {routine.emoji}
            </span>
            
            {/* Subtle Notion style complete indicator badge */}
            <span className={cn(
              "absolute -top-0.5 -right-0.5 size-2 rounded-full border border-background transition-transform duration-300",
              done 
                ? "bg-emerald-500 scale-100" 
                : "bg-transparent scale-0"
            )} />
          </button>
        );
      })}
    </div>
  );
}

