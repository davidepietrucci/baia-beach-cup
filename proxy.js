import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
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

  // 1. Protezione Area Staff tramite Clerk
  if (pathname.startsWith("/staff")) {
    return clerk(req, event);
  }

  // 2. Protezione Area Atleta tramite NextAuth (mantenendo la compatibilità esistente)
  if (pathname.startsWith("/atleta") && pathname !== "/atleta") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/atleta", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/atleta/:path*"],
};
