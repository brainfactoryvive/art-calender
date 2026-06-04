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
  const sandboxCookie = request.cookies.get("sandbox-override")?.value;
  const hasSandboxParam = searchParams.has("sandbox") || sandboxCookie === "student" || sandboxCookie === "admin";
  
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron");

  console.log(`[middleware] pathname: ${pathname}, hasSandbox: ${hasSandboxParam}, sandboxCookie: ${sandboxCookie}, user: ${user ? user.email : "null"}`);

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
    console.log(`[middleware] Redirecting unauthenticated request to /login for path: ${pathname}`);
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
