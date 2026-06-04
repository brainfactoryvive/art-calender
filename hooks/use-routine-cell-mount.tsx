"use client";

import { useCallback, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DayCellMountArg, DayHeaderMountArg } from "@fullcalendar/core";

import { RoutineDayMarkers } from "@/components/routine-day-markers";
import type { CalendarViewType } from "@/types/calendar";
import type { Routine } from "@/types/routine";

const ROUTINE_DAY_VIEWS: CalendarViewType[] = [
  "dayGridMonth",
];

type MountOptions = {
  routines: Routine[];
  enabled: boolean;
  isCompleted: (routineId: string, date: Date) => boolean;
  onToggle: (routineId: string, date: Date) => void;
};

export function useRoutineCellMount({
  routines,
  enabled,
  isCompleted,
  onToggle,
}: MountOptions) {
  const rootsRef = useRef<Map<string, Root>>(new Map());

  const unmountCell = useCallback((dateKey: string) => {
    const root = rootsRef.current.get(dateKey);
    if (root) {
      setTimeout(() => {
        try {
          root.unmount();
        } catch (e) {
          // 이미 React 트리 소멸 등의 이유로 내부 언마운트되었을 경우의 오류 방지
          console.warn("React root unmount safely ignored:", e);
        }
      }, 0);
      rootsRef.current.delete(dateKey);
    }
  }, []);

  const handleDayCellDidMount = useCallback(
    (arg: DayCellMountArg) => {
      if (!enabled || routines.length === 0) return;
      if (!ROUTINE_DAY_VIEWS.includes(arg.view.type as CalendarViewType)) {
        return;
      }

      const frame = arg.el.querySelector(".fc-daygrid-day-frame");
      if (!frame) return;

      let anchor = frame.querySelector(".fc-routine-anchor") as HTMLElement | null;
      if (!anchor) {
        anchor = document.createElement("div");
        anchor.className = "fc-routine-anchor";
        frame.appendChild(anchor);
      }

      const dateKey = arg.date.toISOString();
      unmountCell(dateKey);

      const root = createRoot(anchor);
      rootsRef.current.set(dateKey, root);
      root.render(
        <RoutineDayMarkers
          date={arg.date}
          routines={routines}
          isCompleted={isCompleted}
          onToggle={onToggle}
        />,
      );
    },
    [enabled, routines, isCompleted, onToggle, unmountCell],
  );

  const handleDayCellWillUnmount = useCallback(
    (arg: DayCellMountArg) => {
      unmountCell(arg.date.toISOString());
    },
    [unmountCell],
  );

  const handleDayHeaderDidMount = useCallback(
    (arg: DayHeaderMountArg) => {
      if (!enabled || routines.length === 0) return;
      if (!["timeGridWeek", "timeGridDay"].includes(arg.view.type)) {
        return;
      }

      let anchor = arg.el.querySelector(".fc-routine-anchor") as HTMLElement | null;
      if (!anchor) {
        anchor = document.createElement("div");
        anchor.className = "fc-routine-anchor mt-1.5 flex justify-center w-full";
        arg.el.appendChild(anchor);
      }

      const dateKey = `header-${arg.date.toISOString()}`;
      unmountCell(dateKey);

      const root = createRoot(anchor);
      rootsRef.current.set(dateKey, root);
      root.render(
        <RoutineDayMarkers
          date={arg.date}
          routines={routines}
          isCompleted={isCompleted}
          onToggle={onToggle}
        />,
      );
    },
    [enabled, routines, isCompleted, onToggle, unmountCell],
  );

  const handleDayHeaderWillUnmount = useCallback(
    (arg: DayHeaderMountArg) => {
      unmountCell(`header-${arg.date.toISOString()}`);
    },
    [unmountCell],
  );

  useEffect(() => {
    return () => {
      rootsRef.current.forEach((root) => {
        setTimeout(() => {
          try {
            root.unmount();
          } catch (e) {
            // 무시
          }
        }, 0);
      });
      rootsRef.current.clear();
    };
  }, []);

  return {
    handleDayCellDidMount,
    handleDayCellWillUnmount,
    handleDayHeaderDidMount,
    handleDayHeaderWillUnmount,
  };
}
