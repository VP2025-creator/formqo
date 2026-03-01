

## Cloudflare DNS and Subdomain Setup Guide

This plan creates a comprehensive Markdown reference document (`docs/cloudflare-setup.md`) with full instructions for migrating DNS to Cloudflare and configuring every Formqo subdomain.

### What the guide will cover

1. **Transferring DNS to Cloudflare** -- adding the domain, updating nameservers at the registrar
2. **DNS records for each subdomain:**

| Subdomain | Type | Target | Proxy |
|---|---|---|---|
| `formqo.com` (root) | A or CNAME | Vercel / marketing host | Proxied |
| `www.formqo.com` | CNAME | `formqo.com` | Proxied |
| `app.formqo.com` | CNAME | `formqo.lovable.app` | DNS-only |
| `share.formqo.com` | Worker route | Cloudflare Worker | Proxied |
| `embed.formqo.com` | Worker route | Cloudflare Worker | Proxied |
| `api.formqo.com` | CNAME | `vsznqfhfbqqajgexzzky.supabase.co` | DNS-only |

3. **Lovable custom domain setup** -- connecting `app.formqo.com` in Lovable project settings
4. **Cloudflare Worker setup** for `share.formqo.com` -- route binding, Worker script skeleton for fetching form data and rendering HTML
5. **Embed loader** on `embed.formqo.com` -- lightweight JS snippet served by a Worker or Pages
6. **API proxy** on `api.formqo.com` -- proxying to the backend edge functions
7. **SSL/TLS settings** -- Full (Strict) mode, edge certificates, HSTS
8. **Email DNS records** -- MX, SPF, DKIM, DMARC for `@formqo.com` email
9. **Verification checklist** -- commands to confirm each subdomain resolves correctly

### File to create

| File | Action |
|---|---|
| `docs/cloudflare-setup.md` | Create -- full setup guide |

### Technical details

- The guide will reference the actual Lovable published URL (`formqo.lovable.app`) for the `app` CNAME target
- For `api.formqo.com`, it will reference the backend URL pattern for edge functions
- Worker code examples will include the form-fetching logic and CORS headers matching the existing `submit-form` edge function patterns
- The `app.formqo.com` CNAME must use DNS-only (grey cloud) mode because Lovable provisions its own SSL certificate and Cloudflare proxy would break the verification
- Email records section will include placeholder values for the user to fill in from their email provider

