"use client";

import { useState } from "react";

import { ArtCalendar } from "@/components/art-calendar";
import { useAuth } from "@/components/auth-provider";
import { RoutineGuidelines } from "@/components/routine-guidelines";
import { RoutineSetupModal } from "@/components/routine-setup-modal";
import { useRoutines } from "@/hooks/use-routines";
import type { Routine } from "@/types/routine";

export function StudentCalendarShell() {
  const { role } = useAuth();
  const isStudent = role === "student";

  const {
    routines,
    setupRequired,
    isLoading,
    refetch,
    setRoutines,
    setSetupRequired,
  } = useRoutines(isStudent);

  const [setupOpen, setSetupOpen] = useState(false);

  const showSetup = isStudent && !isLoading && setupRequired;

  return (
    <>
      {isStudent && (
        <div className="mb-4">
          <RoutineGuidelines />
        </div>
      )}

      <ArtCalendar
        routines={isStudent ? routines : []}
        routinesEnabled={isStudent && routines.length === 3}
      />

      <RoutineSetupModal
        open={showSetup || setupOpen}
        onOpenChange={(open) => {
          if (!open && setupRequired) return;
          setSetupOpen(open);
        }}
        onCompleted={(next: Routine[]) => {
          setRoutines(next);
          setSetupRequired(false);
          refetch();
        }}
      />

      {isStudent && !setupRequired && routines.length === 3 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          루틴을 수정하려면{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setSetupOpen(true)}
          >
            루틴 다시 설정
          </button>
        </p>
      )}
    </>
  );
}
