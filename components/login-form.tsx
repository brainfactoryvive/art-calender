"use client";

import { OAuthButtons } from "@/components/oauth-buttons";
import { Button } from "@/components/ui/button";

export function LoginForm() {
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
          구글 계정으로 간편하게 시작하세요.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <OAuthButtons />

        {process.env.NODE_ENV === "development" && (
          <>
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
                onClick={() => {
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
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        관리자 권한: Supabase에서{" "}
        <code className="rounded bg-muted px-1">profiles.role = admin</code>
      </p>
    </div>
  );
}
