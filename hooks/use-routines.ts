"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Routine } from "@/types/routine";

export function useRoutines(enabled: boolean) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutines = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/routines");
      const payload = (await response.json()) as {
        routines?: Routine[];
        setupRequired?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "루틴을 불러오지 못했습니다.");
      }

      setRoutines(payload.routines ?? []);
      setSetupRequired(Boolean(payload.setupRequired));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "루틴을 불러오지 못했습니다.",
      );
      setRoutines([]);
      setSetupRequired(false);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel("routines-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routines" },
        () => fetchRoutines(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchRoutines]);

  return {
    routines,
    setupRequired,
    isLoading,
    error,
    refetch: fetchRoutines,
    setRoutines,
    setSetupRequired,
  };
}
