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
    label: "Google로 계속하기",
    provider: "google",
    className: "bg-background text-foreground border-border hover:bg-muted",
  },
  {
    id: "kakao",
    label: "카카오로 계속하기",
    provider: "kakao",
    className: "bg-[#FEE500] text-[#191919] border-[#FEE500] hover:brightness-95",
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    provider: "naver",
    className: "bg-[#03C75A] text-white border-[#03C75A] hover:brightness-95",
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
