import { NextResponse } from "next/server"

import type { NextRequest } from "next/server"

import {
  ensureLocalizedPathname,
  getLocaleFromPathname,
  getPreferredLocale,
} from "@/lib/i18n"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!getLocaleFromPathname(pathname)) {
    const locale = getPreferredLocale(request)
    const destination = ensureLocalizedPathname(pathname, locale)
    return NextResponse.redirect(
      new URL(destination + request.nextUrl.search, request.url)
    )
  }

  const locale = getLocaleFromPathname(pathname)
  const localizedRoute = pathname.slice(`/${locale}`.length) || "/"
  const publicRoutes = [
    "/",
    "/docs",
    "/sign-in",
    "/register",
    "/forgot-password",
    "/verify-email",
    "/new-password",
  ]
  const isPublicRoute = publicRoutes.some(
    (route) =>
      localizedRoute === route || localizedRoute.startsWith(`${route}/`)
  )

  if (!isPublicRoute && request.cookies.get("demo-auth")?.value !== "1") {
    const destination = `/${locale}/sign-in?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|docs).*)",
  ],
}
