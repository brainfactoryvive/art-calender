import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const hasSandboxParam = searchParams.has("sandbox") || request.cookies.has("sandbox-override");
  
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron");

  // Bypass authentication checks for local sandbox testing
  if (hasSandboxParam) {
    if (pathname === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      const response = NextResponse.redirect(redirectUrl);
      if (searchParams.has("sandbox")) {
        response.cookies.set("sandbox-override", searchParams.get("sandbox") || "student", { maxAge: 60 * 60, path: "/" });
      }
      return response;
    }
    const response = NextResponse.next();
    if (searchParams.has("sandbox")) {
      response.cookies.set("sandbox-override", searchParams.get("sandbox") || "student", { maxAge: 60 * 60, path: "/" });
    }
    return response;
  }


  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }


  return supabaseResponse;
}
