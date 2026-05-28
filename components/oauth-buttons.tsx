"use client";

import { useState } from "react";

import { OAUTH_PROVIDERS, signInWithOAuth } from "@/lib/auth/oauth";
import { cn } from "@/lib/utils";

export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: (typeof OAUTH_PROVIDERS)[number]) => {
    setLoadingProvider(provider.id);
    setError(null);

    try {
      await signInWithOAuth(provider.provider);
    } catch (oauthError) {
      const raw =
        oauthError instanceof Error
          ? oauthError.message
          : "소셜 로그인에 실패했습니다.";

      if (raw.includes("provider") || raw.includes("not enabled")) {
        setError(
          `${provider.label}: Supabase 대시보드에서 Provider를 활성화하고 Redirect URL을 등록해 주세요.`,
        );
      } else {
        setError(raw);
      }
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-2">
      {OAUTH_PROVIDERS.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuth(item)}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-lg border text-sm font-medium transition-opacity",
            item.className,
            loadingProvider === item.id && "opacity-70",
          )}
        >
          {loadingProvider === item.id ? "연결 중…" : item.label}
        </button>
      ))}

      {error && (
        <p className="text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        카카오·네이버는 Supabase 대시보드에서 OAuth Provider를 활성화해야
        합니다.
      </p>
    </div>
  );
}
