"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventInput } from "@fullcalendar/core";

import { mergeCalendarEvents } from "@/lib/events/merge-calendar-events";
import { mapEventsToFullCalendar } from "@/lib/events/map-to-fullcalendar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserRole } from "@/types/auth";
import type { CalendarEvent } from "@/types/event";

type UseCalendarEventsOptions = {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  role: UserRole | null;
  userId: string | null;
};

export function useCalendarEvents({
  rangeStart,
  rangeEnd,
  role,
  userId,
}: UseCalendarEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const applyEvents = useCallback(
    (nextEvents: CalendarEvent[]) => {
      if (!role || !userId) {
        setEvents([]);
        setCalendarEvents([]);
        return;
      }

      const merged = mergeCalendarEvents(nextEvents);
      setEvents(merged);
      setCalendarEvents(
        mapEventsToFullCalendar(merged, { role, currentUserId: userId }),
      );
    },
    [role, userId],
  );

  const fetchEvents = useCallback(
    async (start: Date, end: Date) => {
      if (!role || !userId) return;

      const fetchId = ++fetchIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        });

        const response = await fetch(`/api/events?${params.toString()}`);
        const payload = (await response.json()) as {
          events?: CalendarEvent[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "일정을 불러오지 못했습니다.");
        }

        if (fetchId !== fetchIdRef.current) return;

        applyEvents(payload.events ?? []);
      } catch (fetchError) {
        if (fetchId !== fetchIdRef.current) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "일정을 불러오지 못했습니다.";
        setError(message);
        applyEvents([]);
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [applyEvents, role, userId],
  );

  const upsertEvent = useCallback(
    (event: CalendarEvent) => {
      setEvents((prev) => {
        const exists = prev.some((item) => item.id === event.id);
        const raw = exists
          ? prev.map((item) => (item.id === event.id ? event : item))
          : [...prev, event];
        applyEvents(raw);
        return raw;
      });
    },
    [applyEvents],
  );

  const removeEvent = useCallback(
    (eventId: string) => {
      setEvents((prev) => {
        const raw = prev.filter((item) => item.id !== eventId);
        applyEvents(raw);
        return raw;
      });
    },
    [applyEvents],
  );

  useEffect(() => {
    if (!rangeStart || !rangeEnd || !role || !userId) return;
    fetchEvents(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, role, userId, fetchEvents]);

  useEffect(() => {
    if (
      !isSupabaseConfigured() ||
      !rangeStart ||
      !rangeEnd ||
      !role ||
      !userId
    ) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`events-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          fetchEvents(rangeStart, rangeEnd);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rangeStart, rangeEnd, role, userId, fetchEvents]);

  return {
    events,
    calendarEvents,
    isLoading,
    error,
    upsertEvent,
    removeEvent,
    refetch: fetchEvents,
  };
}
