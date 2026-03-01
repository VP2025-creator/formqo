import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MARKETING_URL, APP_URL } from "@/lib/urls";

/**
 * Routes that belong on app.formqo.com (the dashboard).
 * Everything else is considered a marketing/public route on formqo.com.
 */
const APP_ROUTES = [
  "/dashboard",
  "/admin",
  "/builder",
  "/forms/",
  "/settings",
  "/templates",
];

/** Routes served on their own subdomain or shared across both */
const SHARED_ROUTES = ["/login", "/signup", "/f/"];

function isAppRoute(pathname: string) {
  return APP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r)
  );
}

function isSharedRoute(pathname: string) {
  return SHARED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r)
  );
}

/**
 * Checks the current hostname against the expected subdomain for the active
 * route and performs a full redirect when there's a mismatch.
 *
 * Only runs in production (when hostname includes "formqo.com").
 */
export default function SubdomainGuard() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const host = window.location.hostname;

    // Only enforce in production
    if (!host.includes("formqo.com")) return;

    // Shared routes are fine on either domain
    if (isSharedRoute(pathname)) return;

    const isOnApp = host.startsWith("app.");
    const shouldBeOnApp = isAppRoute(pathname);

    if (shouldBeOnApp && !isOnApp) {
      // Redirect to app subdomain
      window.location.replace(`${APP_URL}${pathname}${search}${hash}`);
    } else if (!shouldBeOnApp && isOnApp) {
      // Redirect to marketing domain
      window.location.replace(`${MARKETING_URL}${pathname}${search}${hash}`);
    }
  }, [pathname, search, hash]);

  return null;
}
