"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SessionPayload, UserRole } from "@/types/auth";

type AuthContextValue = {
  session: SessionPayload | null;
  role: UserRole | null;
  dbRole: UserRole | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  setOverrideRole: (role: UserRole | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overrideRole, setOverrideRoleState] = useState<UserRole | null>(null);

  const setOverrideRole = useCallback((role: UserRole | null) => {
    setOverrideRoleState(role);
    if (typeof document !== "undefined") {
      if (role) {
        document.cookie = `sandbox-override=${role}; path=/; max-age=3600`;
      } else {
        document.cookie = "sandbox-override=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      }
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      const payload = (await response.json()) as SessionPayload & {
        error?: string;
      };

      if (!response.ok) {
        if (payload.error) {
          console.error("[auth]", payload.error);
        }
        setSession(null);
        return;
      }

      setSession(payload);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    // Check if query parameter has sandbox mode request
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sandboxRole = params.get("sandbox");
      if (sandboxRole === "student" || sandboxRole === "admin") {
        setOverrideRole(sandboxRole);
        // Clear parameters from address bar cleanly
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } else {
        // Fallback: Read cookie if preset
        const match = document.cookie.match(/(?:^|; )sandbox-override=([^;]*)/);
        if (match && (match[1] === "student" || match[1] === "admin")) {
          setOverrideRoleState(match[1] as UserRole);
        }
      }
    }


    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    refreshSession().finally(() => setIsLoading(false));

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });

    return () => subscription.unsubscribe();
  }, [refreshSession]);


  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      // 샌드박스 오버라이드 및 세션 관련 쿠키 완전 초기화
      document.cookie = "sandbox-override=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

      // Supabase 캐시 및 브라우저 로컬 저장소 완전 삭제 (로그인 정보 강제 파기)
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase") || key.includes("auth")) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        // Supabase 서버 세션 파기 및 쿠키 만료 유도
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Supabase signOut error", e);
      }
    }

    setSession(null);
    setOverrideRole(null);
    
    // 페이지를 강제 새로고침(Reload)하면서 로그인 화면으로 보내 잔여 메모리 상태까지 소멸시킵니다.
    window.location.href = "/login";
  }, []);

  // Sandbox automatic mock session if we want to preview without fully logging in
  const activeSession = useMemo(() => {
    if (overrideRole) {
      return {
        user: { id: "sandbox-mock-id", email: "sandbox@artcalendar.test" },
        profile: {
          id: "sandbox-mock-id",
          role: overrideRole,
          display_name: overrideRole === "admin" ? "샌드박스 관리자" : "샌드박스 학생",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
    return session;
  }, [session, overrideRole]);

  const activeRole = useMemo(() => {
    return overrideRole ?? session?.profile.role ?? null;
  }, [overrideRole, session]);

  const dbRole = useMemo(() => {
    return session?.profile.role ?? null;
  }, [session]);

  const isAuthLoading = useMemo(() => {
    if (overrideRole) return false;
    return isLoading;
  }, [isLoading, overrideRole]);


  const value = useMemo(
    () => ({
      session: activeSession,
      role: activeRole,
      dbRole,
      isLoading: isAuthLoading,
      refreshSession,
      signOut,
      setOverrideRole,
    }),
    [activeSession, activeRole, dbRole, isAuthLoading, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}



export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

