"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OAuthButtons } from "@/components/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });

        if (signUpError) throw signUpError;
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "로그인에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Art Admissions
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          입시 일정 로그인
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          간편 로그인 또는 이메일로 시작하세요.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
          간편 로그인
        </p>
        <OAuthButtons />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <div className="mb-4 flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("login")}
          >
            이메일 로그인
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="grid gap-2">
              <Label htmlFor="display-name">이름</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? "처리 중…"
              : mode === "login"
                ? "이메일로 로그인"
                : "학생 계정 만들기"}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border border-dashed" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground">개발 테스트용 샌드박스</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-xs"
            onClick={async () => {
              // Bypasses via AuthProvider custom override Role
              const { setOverrideRole } = await import("@/components/auth-provider").then(m => {
                // Fetch context directly from a separate trigger or we can just redirect
                // Since useRouter can push to '/' after setting it, let's redirect.
                // But the easiest is to just let the user click the button to trigger redirect and set session
                return m;
              });
              // To handle this cleanly, we can trigger custom session cookies or use simple client route.
              // Let's redirect to main and use local storage or we can import useAuth.
              // Instead of dynamic hook, we can just use router to push to "/" which has the "Try Sandbox" button,
              // or let the form render sandbox option.
              window.location.href = "/?sandbox=student";
            }}
          >
            학생 뷰로 시작
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => {
              window.location.href = "/?sandbox=admin";
            }}
          >
            관리자 뷰로 시작
          </Button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        관리자 권한: Supabase에서{" "}
        <code className="rounded bg-muted px-1">profiles.role = admin</code>
      </p>
    </div>

  );
}
