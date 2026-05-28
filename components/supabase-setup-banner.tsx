"use client";

import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SupabaseSetupBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-950 dark:text-amber-100">
      Supabase 연결이 필요합니다. 프로젝트 루트에{" "}
      <code className="rounded bg-background/80 px-1">.env.local</code>을 만들고{" "}
      <code className="rounded bg-background/80 px-1">
        NEXT_PUBLIC_SUPABASE_URL
      </code>
      ,{" "}
      <code className="rounded bg-background/80 px-1">
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </code>
      를 설정한 뒤 개발 서버를 재시작하세요. (참고:{" "}
      <code className="rounded bg-background/80 px-1">env.local.example</code>)
    </div>
  );
}
