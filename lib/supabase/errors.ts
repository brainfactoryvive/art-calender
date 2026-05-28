export function formatSupabaseError(message: string): string {
  if (message.includes("Could not find the table")) {
    const table = message.match(/'public\.(\w+)'/)?.[1];
    return `Supabase 테이블이 없습니다${table ? ` (${table})` : ""}. SQL Editor에서 supabase/SETUP.sql 을 실행해 주세요.`;
  }

  if (message.includes("column") && message.includes("does not exist")) {
    return `DB 컬럼이 최신이 아닙니다. supabase/SETUP.sql 을 다시 실행해 주세요. (${message})`;
  }

  if (message.includes("JWT")) {
    return "Supabase API 키가 올바르지 않습니다. .env.local 의 URL/ANON_KEY 를 확인해 주세요.";
  }

  return message;
}
