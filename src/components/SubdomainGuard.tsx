import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Known production hostnames. Only redirect when BOTH domains are live.
 */
const MARKETING_HOST = "formqo.com";
const APP_HOST = "app.formqo.com";

const APP_ROUTES = [
  "/dashboard",
  "/admin",
  "/builder",
  "/forms/",
  "/settings",
];

const SHARED_ROUTES = ["/login", "/signup", "/f/", "/templates", "/pricing"];

function isAppRoute(pathname: string) {
  return APP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r)
  );
}

function isSharedRoute(pathname: string) {
  return SHARED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r)
  );
}

/**
 * Redirects users to the correct subdomain in production.
 * Only activates when hostname is exactly formqo.com or app.formqo.com.
 */
export default function SubdomainGuard() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const host = window.location.hostname;

    // Only act on exact production hostnames
    if (host !== MARKETING_HOST && host !== APP_HOST) return;

    // Shared routes live on both domains
    if (isSharedRoute(pathname)) return;

    const isOnApp = host === APP_HOST;
    const shouldBeOnApp = isAppRoute(pathname);

    if (shouldBeOnApp && !isOnApp) {
      window.location.replace(`https://${APP_HOST}${pathname}${search}${hash}`);
    } else if (!shouldBeOnApp && isOnApp) {
      window.location.replace(`https://${MARKETING_HOST}${pathname}${search}${hash}`);
    }
  }, [pathname, search, hash]);

  return null;
}
