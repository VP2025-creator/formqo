

## Update All Links and References to Use Formqo Subdomains

Based on your subdomain architecture, this plan updates every hardcoded URL and reference across the codebase to point to the correct subdomain.

### Subdomain mapping

| Subdomain | Purpose |
|---|---|
| `formqo.com` | Marketing / homepage (canonical URLs, SEO meta) |
| `app.formqo.com` | Dashboard / authenticated app |
| `share.formqo.com` | Public form rendering |
| `embed.formqo.com` | JS embed loader |
| `api.formqo.com` | Backend API |

### Changes

**1. Create a central constants file (`src/lib/urls.ts`)**

A single source of truth for all subdomain URLs, making future changes easy:
- `MARKETING_URL = "https://formqo.com"`
- `APP_URL = "https://app.formqo.com"`
- `SHARE_URL = "https://share.formqo.com"`
- `EMBED_URL = "https://embed.formqo.com"`
- `API_URL = "https://api.formqo.com"`
- Helper functions: `getShareUrl(formId)`, `getEmbedUrl(formId)`

**2. Update `index.html` (static SEO fallback)**

Replace all `formqo.lovable.app` references with `formqo.com`:
- Canonical URL -> `https://formqo.com/`
- Open Graph URLs -> `https://formqo.com/`

**3. Update page-level SEO meta (Helmet tags)**

Replace `formqo.lovable.app` with `formqo.com` in canonical/OG URLs across:
- `Index.tsx` -- canonical, og:url, Organization schema URL
- `Pricing.tsx` -- canonical, og:url
- `Templates.tsx` -- canonical
- `Login.tsx` -- canonical (-> `app.formqo.com/login`)
- `Signup.tsx` -- canonical (-> `app.formqo.com/signup`)

**4. Update `FormBuilder.tsx`**

- Remove the inline `SHARE_BASE` / `EMBED_BASE` constants
- Import from the new `src/lib/urls.ts` instead
- All share/embed references automatically use the correct subdomains

**5. Update `AdminDashboard.tsx`**

- Share link (`https://share.formqo.com/f/{id}`) -- import from constants
- Placeholder text referencing `share.formqo.com` stays as-is (already correct)

**6. Update `Footer.tsx`**

- Wire up the Product links (Features, Pricing, Templates) to use proper paths
- "Integrations" link points to `/dashboard/integrations`

**7. Update `Logo.tsx`**

- When used on marketing pages, links to `/` (current behavior, fine)
- The Navbar already passes `to="/dashboard"` for the app shell -- no change needed

**8. No changes needed for:**
- `submit-form/index.ts` edge function -- already references `share.formqo.com` correctly
- `Settings.tsx` -- `support@formqo.com` email is correct
- `Pricing.tsx` -- `hello@formqo.com` email is correct

### Summary of files to create/edit

| File | Action |
|---|---|
| `src/lib/urls.ts` | Create (new constants file) |
| `index.html` | Edit (update canonical/OG URLs) |
| `src/pages/Index.tsx` | Edit (SEO URLs) |
| `src/pages/Pricing.tsx` | Edit (SEO URLs) |
| `src/pages/Templates.tsx` | Edit (SEO URLs) |
| `src/pages/Login.tsx` | Edit (canonical URL) |
| `src/pages/Signup.tsx` | Edit (canonical URL) |
| `src/pages/FormBuilder.tsx` | Edit (import constants) |
| `src/pages/AdminDashboard.tsx` | Edit (import constants) |
| `src/components/Footer.tsx` | Edit (wire up links) |

