import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isStaffProtectedRoute = createRouteMatcher(["/staff/(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isStaffProtectedRoute(req)) {
    await auth.protect();
  }
});

export async function proxy(req, event) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/staff") || pathname.startsWith("/api")) {
    return clerk(req, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/api/:path*"],
};
