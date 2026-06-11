import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 1. Protezione Area Staff
  if (pathname.startsWith("/staff") && pathname !== "/staff") {
    // Se non c'è token o il ruolo non è autorizzato come staff/admin
    if (!token || (token.role !== "admin" && token.role !== "staff")) {
      const loginUrl = new URL("/staff", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Se un utente staff semplice prova ad accedere ad aree riservate all'admin (es. anagrafica atleti)
    if (token.role === "staff" && pathname.startsWith("/staff/atleti")) {
      const dashboardUrl = new URL("/staff/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 2. Protezione Area Atleta
  if (pathname.startsWith("/atleta") && pathname !== "/atleta") {
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
