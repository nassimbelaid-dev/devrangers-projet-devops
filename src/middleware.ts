import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ensureLocalizedPathname, getLocaleFromPathname, getPreferredLocale } from "@/lib/i18n"

// L'application est consultable en mode frontend ; l'authentification sera réintroduite ultérieurement.
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!getLocaleFromPathname(pathname)) {
    const locale = getPreferredLocale(request)
    const destination = ensureLocalizedPathname(pathname, locale)
    return NextResponse.redirect(new URL(destination + request.nextUrl.search, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|docs).*)"],
}
