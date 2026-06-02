import type { Provider } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type OAuthProviderId = "google" | "kakao" | "naver";

export const OAUTH_PROVIDERS: {
  id: OAuthProviderId;
  label: string;
  provider: string;
  className: string;
}[] = [
  {
    id: "google",
    label: "Google로 로그인 / 가입하기",
    provider: "google",
    className: "bg-background text-foreground border-border hover:bg-muted",
  },
];

export async function signInWithOAuth(provider: Provider | string) {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo,
      queryParams:
        provider === "kakao"
          ? { scope: "profile_nickname account_email" }
          : undefined,
    },
  });

  if (error) {
    throw error;
  }
}
