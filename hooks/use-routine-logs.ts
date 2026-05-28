"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { logKey, toDateKey } from "@/lib/routines/date-key";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { RoutineLog } from "@/types/routine";

type UseRoutineLogsOptions = {
  enabled: boolean;
  rangeStart: Date | null;
  rangeEnd: Date | null;
};

export function useRoutineLogs({
  enabled,
  rangeStart,
  rangeEnd,
}: UseRoutineLogsOptions) {
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const completedMap = useMemo(() => {
    const map = new Set<string>();
    for (const log of logs) {
      if (log.completed) {
        map.add(logKey(log.routine_id, log.log_date));
      }
    }
    return map;
  }, [logs]);

  const fetchLogs = useCallback(
    async (start: Date, end: Date) => {
      if (!enabled) return;

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          start: toDateKey(start),
          end: toDateKey(new Date(end.getTime() - 1)),
        });

        const response = await fetch(`/api/routine-logs?${params.toString()}`);
        const payload = (await response.json()) as {
          logs?: RoutineLog[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "루틴 기록을 불러오지 못했습니다.");
        }

        setLogs(payload.logs ?? []);
      } catch {
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled],
  );

  const toggleLog = useCallback(
    async (routineId: string, date: Date) => {
      const logDate = toDateKey(date);
      const key = logKey(routineId, logDate);
      const wasCompleted = completedMap.has(key);

      setLogs((prev) => {
        const existing = prev.find(
          (item) =>
            item.routine_id === routineId && item.log_date === logDate,
        );

        if (existing) {
          return prev.map((item) =>
            item.id === existing.id
              ? { ...item, completed: !wasCompleted }
              : item,
          );
        }

        return [
          ...prev,
          {
            id: `optimistic-${key}`,
            user_id: "",
            routine_id: routineId,
            log_date: logDate,
            completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });

      try {
        const response = await fetch("/api/routine-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routine_id: routineId,
            log_date: logDate,
            completed: !wasCompleted,
          }),
        });

        const payload = (await response.json()) as {
          log?: RoutineLog;
          error?: string;
        };

        if (!response.ok || !payload.log) {
          throw new Error(payload.error);
        }

        setLogs((prev) => {
          const filtered = prev.filter(
            (item) =>
              !(
                item.routine_id === routineId && item.log_date === logDate
              ),
          );
          return [...filtered, payload.log!];
        });
      } catch {
        if (rangeStart && rangeEnd) {
          fetchLogs(rangeStart, rangeEnd);
        }
      }
    },
    [completedMap, rangeStart, rangeEnd, fetchLogs],
  );

  const isCompleted = useCallback(
    (routineId: string, date: Date) => {
      return completedMap.has(logKey(routineId, toDateKey(date)));
    },
    [completedMap],
  );

  useEffect(() => {
    if (!rangeStart || !rangeEnd || !enabled) return;
    fetchLogs(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, enabled, fetchLogs]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !rangeStart || !rangeEnd) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel("routine-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routine_logs" },
        () => fetchLogs(rangeStart, rangeEnd),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, rangeStart, rangeEnd, fetchLogs]);

  return {
    logs,
    isLoading,
    isCompleted,
    toggleLog,
    refetch: fetchLogs,
  };
}
