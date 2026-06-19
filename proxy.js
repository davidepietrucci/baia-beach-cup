import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Definisce quali rotte dello staff proteggere tramite Clerk (tutte tranne la pagina di login principale)
const isStaffProtectedRoute = createRouteMatcher(["/staff/(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isStaffProtectedRoute(req)) {
    await auth.protect();
  }
});

export async function proxy(req, event) {
  const { pathname } = req.nextUrl;

  // 1. Esegui Clerk middleware sia per l'area staff che per le API, per popolare la sessione
  if (pathname.startsWith("/staff") || pathname.startsWith("/api")) {
    return clerk(req, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/api/:path*"],
};
