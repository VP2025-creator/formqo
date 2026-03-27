/**
 * SubdomainGuard — disabled.
 *
 * Lovable redirects all non-primary custom domains to the primary domain,
 * so client-side subdomain enforcement creates an infinite redirect loop.
 *
 * To use app.formqo.com as a separate origin you would need a Cloudflare
 * Worker reverse-proxy in front of the Lovable deployment.
 */
export default function SubdomainGuard() {
  return null;
}
