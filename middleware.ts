import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/org/(.*)",
  "/api/(.*)",
]);

const isOrgRoute = createRouteMatcher([
  "/org/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Redirect protected routes to sign-in if not authenticated
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Handle organization context for org routes
  if (isOrgRoute(req)) {
    const { orgId } = await auth();
    const url = req.nextUrl.clone();

    // If no orgId but user is signed in, redirect to org selection
    if (!orgId) {
      url.pathname = "/select-org";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};