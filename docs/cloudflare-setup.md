# Cloudflare DNS & Subdomain Setup Guide for Formqo

> Complete instructions for migrating `formqo.com` DNS to Cloudflare and configuring all subdomains.

---

## Table of Contents

1. [Add Domain to Cloudflare](#1-add-domain-to-cloudflare)
2. [Update Nameservers at Registrar](#2-update-nameservers-at-registrar)
3. [DNS Records](#3-dns-records)
4. [Connect app.formqo.com to Lovable](#4-connect-appformqocom-to-lovable)
5. [Cloudflare Worker — share.formqo.com](#5-cloudflare-worker--shareformqocom)
6. [Cloudflare Worker — embed.formqo.com](#6-cloudflare-worker--embedformqocom)
7. [API Proxy — api.formqo.com](#7-api-proxy--apiformqocom)
8. [SSL/TLS Settings](#8-ssltls-settings)
9. [Email DNS Records](#9-email-dns-records)
10. [Verification Checklist](#10-verification-checklist)

---

## 1. Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Click **Add a site** → enter `formqo.com`.
3. Select the **Free** plan (sufficient for DNS + Workers on the free tier, or choose Pro/Business if needed).
4. Cloudflare will scan existing DNS records. Review them but **do not finalize yet** — you'll set them up properly in Step 3.
5. Cloudflare assigns you two nameservers (e.g. `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`). Note these down.

---

## 2. Update Nameservers at Registrar

1. Go to your domain registrar (e.g. Namecheap, Google Domains, GoDaddy).
2. Find the **Nameservers** section for `formqo.com`.
3. Replace the current nameservers with the two Cloudflare nameservers from Step 1.
4. Save changes.
5. Wait for propagation (usually 1–24 hours, can take up to 48 hours).
6. Cloudflare will email you when the domain is **active**.

> ⚠️ During propagation, your site may experience brief downtime if old records expire before Cloudflare's activate. Plan accordingly.

---

## 3. DNS Records

Once the domain is active on Cloudflare, configure the following records in **DNS → Records**:

### 3.1 Root domain — `formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `@` | `76.76.21.21` | ☁️ Proxied | Auto |

> The IP `76.76.21.21` is Vercel's anycast IP. If you host the marketing site elsewhere, use that host's IP or CNAME flattening.
>
> If using CNAME flattening (Cloudflare supports this at the root):
> | Type | Name | Content | Proxy | TTL |
> |------|------|---------|-------|-----|
> | CNAME | `@` | `cname.vercel-dns.com` | ☁️ Proxied | Auto |

### 3.2 www redirect — `www.formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | `www` | `formqo.com` | ☁️ Proxied | Auto |

Then add a **Redirect Rule** (Rules → Redirect Rules → Create Rule):
- **When**: Hostname equals `www.formqo.com`
- **Then**: Dynamic redirect to `https://formqo.com${http.request.uri.path}`
- **Status code**: 301
- **Preserve query string**: Yes

### 3.3 App dashboard — `app.formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | `app` | `formqo.lovable.app` | 🔘 DNS only | Auto |

> **Critical**: Must be **DNS-only** (grey cloud). Lovable provisions its own SSL certificate. Cloudflare proxy would intercept TLS and break domain verification.

### 3.4 Share (public forms) — `share.formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `share` | `192.0.2.1` | ☁️ Proxied | Auto |

> The A record pointing to `192.0.2.1` is a placeholder — Cloudflare Workers intercept all requests before they reach this IP. Any valid IP works; `192.0.2.1` is conventional for "handled by Workers."

Then bind a **Worker Route** (see [Section 5](#5-cloudflare-worker--shareformqocom)).

### 3.5 Embed loader — `embed.formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `embed` | `192.0.2.1` | ☁️ Proxied | Auto |

Bound to a Worker route (see [Section 6](#6-cloudflare-worker--embedformqocom)).

### 3.6 API — `api.formqo.com`

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | `api` | `vsznqfhfbqqajgexzzky.supabase.co` | 🔘 DNS only | Auto |

> **DNS-only** because the backend handles its own TLS. Proxying would require Cloudflare to terminate SSL and re-encrypt, adding latency and potential certificate issues.

### Summary Table

| Subdomain | Type | Target | Proxy |
|-----------|------|--------|-------|
| `formqo.com` (root) | A / CNAME | Vercel IP or CNAME | ☁️ Proxied |
| `www.formqo.com` | CNAME | `formqo.com` | ☁️ Proxied |
| `app.formqo.com` | CNAME | `formqo.lovable.app` | 🔘 DNS only |
| `share.formqo.com` | A | `192.0.2.1` (Worker) | ☁️ Proxied |
| `embed.formqo.com` | A | `192.0.2.1` (Worker) | ☁️ Proxied |
| `api.formqo.com` | CNAME | `vsznqfhfbqqajgexzzky.supabase.co` | 🔘 DNS only |

---

## 4. Connect app.formqo.com to Lovable

1. In Lovable, go to **Project → Settings → Domains**.
2. Click **Connect Domain**.
3. Enter `app.formqo.com`.
4. Lovable will ask you to add:
   - An **A record** pointing to `185.158.133.1` — **skip this** since you're using a CNAME to `formqo.lovable.app` instead (Lovable supports both methods).
   - A **TXT record** `_lovable.app` with a verification value like `lovable_verify=XXXX`.
5. Add the TXT record in Cloudflare:

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| TXT | `_lovable.app` | `lovable_verify=XXXX` | N/A | Auto |

> Replace `XXXX` with the actual value Lovable gives you.

6. Wait for verification (usually minutes, up to 72 hours).
7. Once verified, Lovable provisions an SSL certificate and the domain becomes **Active**.

> **Alternative approach**: If Lovable requires A records specifically, use:
> | Type | Name | Content | Proxy | TTL |
> |------|------|---------|-------|-----|
> | A | `app` | `185.158.133.1` | 🔘 DNS only | Auto |
>
> DNS-only mode is still required with A records.

---

## 5. Cloudflare Worker — share.formqo.com

This Worker serves fully rendered HTML for public forms at `https://share.formqo.com/f/{formId}`.

### 5.1 Create the Worker

1. In Cloudflare Dashboard → **Workers & Pages** → **Create Worker**.
2. Name: `formqo-share`.
3. Deploy with the starter template, then edit.

### 5.2 Worker Script

```javascript
// formqo-share Worker
const SUPABASE_URL = "https://vsznqfhfbqqajgexzzky.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY"; // Store as a Worker secret instead

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: GET /f/{formId}
    const match = url.pathname.match(/^\/f\/([a-f0-9-]+)\/?$/i);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const formId = match[1];

    try {
      // Fetch form data from Supabase
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/forms?id=eq.${formId}&select=id,title,description,questions,settings,status`,
        {
          headers: {
            apikey: env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        return new Response("Form not found", { status: 404 });
      }

      const forms = await res.json();
      if (!forms.length) {
        return new Response("Form not found", { status: 404 });
      }

      const form = forms[0];

      if (form.status !== "active") {
        return new Response(renderClosedPage(form), {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      // Render the full HTML page
      return new Response(renderFormPage(form), {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      });
    } catch (err) {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

function renderFormPage(form) {
  const title = escapeHtml(form.title || "Formqo Form");
  const description = escapeHtml(form.description || "Fill out this form");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Formqo</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="https://share.formqo.com/f/${form.id}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="https://share.formqo.com/f/${form.id}" />
  <style>
    /* Inline base styles so the page renders instantly */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #1a1a1a; }
    .container { max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p.desc { color: #666; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1.25rem; }
    label { display: block; font-weight: 500; margin-bottom: 0.25rem; font-size: 0.95rem; }
    input, textarea, select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; }
    textarea { min-height: 80px; resize: vertical; }
    button[type=submit] { background: #2563eb; color: #fff; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    button[type=submit]:hover { background: #1d4ed8; }
    .success { text-align: center; padding: 3rem 1rem; }
    .success h2 { color: #16a34a; }
    .error { color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem; }
    .honeypot { position: absolute; left: -9999px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${title}</h1>
      ${form.description ? `<p class="desc">${description}</p>` : ""}
      <div id="form-root">
        <noscript>This form requires JavaScript to submit.</noscript>
      </div>
    </div>
    <p style="text-align:center;margin-top:1rem;font-size:0.8rem;color:#999;">
      Powered by <a href="https://formqo.com" style="color:#2563eb;text-decoration:none;">Formqo</a>
    </p>
  </div>

  <script>
    // Form data injected server-side
    const FORM_DATA = ${JSON.stringify({
      id: form.id,
      title: form.title,
      questions: form.questions,
      settings: form.settings,
    })};

    const API_BASE = "https://api.formqo.com";

    (async function() {
      const root = document.getElementById("form-root");

      // 1. Fetch CSRF token
      let csrfToken = "";
      try {
        const res = await fetch(API_BASE + "/functions/v1/issue-csrf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId: FORM_DATA.id }),
        });
        const data = await res.json();
        csrfToken = data.token || "";
      } catch (e) {
        console.error("Failed to get CSRF token", e);
      }

      // 2. Build form HTML
      const questions = Array.isArray(FORM_DATA.questions) ? FORM_DATA.questions : [];
      let fieldsHtml = "";

      questions.forEach((q, i) => {
        const id = "q_" + i;
        const required = q.required ? "required" : "";
        const label = escapeHtml(q.title || q.label || "Question " + (i + 1));

        switch (q.type) {
          case "textarea":
          case "long_text":
            fieldsHtml += '<div class="field"><label for="'+id+'">'+label+'</label><textarea id="'+id+'" name="'+id+'" '+required+'></textarea></div>';
            break;
          case "select":
          case "dropdown":
            const opts = (q.options || []).map(o => '<option value="'+escapeHtml(o)+'">'+escapeHtml(o)+'</option>').join("");
            fieldsHtml += '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'" name="'+id+'" '+required+'><option value="">Select…</option>'+opts+'</select></div>';
            break;
          case "email":
            fieldsHtml += '<div class="field"><label for="'+id+'">'+label+'</label><input type="email" id="'+id+'" name="'+id+'" '+required+' /></div>';
            break;
          case "number":
            fieldsHtml += '<div class="field"><label for="'+id+'">'+label+'</label><input type="number" id="'+id+'" name="'+id+'" '+required+' /></div>';
            break;
          default:
            fieldsHtml += '<div class="field"><label for="'+id+'">'+label+'</label><input type="text" id="'+id+'" name="'+id+'" '+required+' /></div>';
        }
      });

      // Honeypot field
      fieldsHtml += '<div class="honeypot"><label for="website">Website</label><input type="text" id="website" name="website" tabindex="-1" autocomplete="off" /></div>';

      root.innerHTML = '<form id="formqo-form">' + fieldsHtml + '<button type="submit">Submit</button></form>';

      // 3. Handle submission
      document.getElementById("formqo-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Submitting…";

        const answers = questions.map((q, i) => ({
          questionId: q.id || "q_" + i,
          value: document.getElementById("q_" + i)?.value || "",
        }));

        const honeypot = document.getElementById("website")?.value || "";

        try {
          const res = await fetch(API_BASE + "/functions/v1/submit-form", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              formId: FORM_DATA.id,
              answers,
              csrfToken,
              honeypot,
              referrer: window.location.href,
            }),
          });

          const result = await res.json();

          if (res.ok && result.success) {
            root.innerHTML = '<div class="success"><h2>✓ Thank you!</h2><p>Your response has been recorded.</p></div>';
          } else {
            btn.disabled = false;
            btn.textContent = "Submit";
            alert(result.error || "Something went wrong. Please try again.");
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Submit";
          alert("Network error. Please check your connection and try again.");
        }
      });
    })();

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}

function renderClosedPage(form) {
  const title = escapeHtml(form.title || "Form");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Closed</title>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;">
  <div style="text-align:center;max-width:400px;padding:2rem;">
    <h1 style="font-size:1.25rem;">This form is no longer accepting responses</h1>
    <p style="color:#666;margin-top:0.5rem;">The form <strong>${title}</strong> has been closed by its creator.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 5.3 Add Worker Secrets

In **Workers & Pages → formqo-share → Settings → Variables**:

| Variable Name | Value |
|---------------|-------|
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key) |

> Use **Encrypt** to store it as a secret.

### 5.4 Bind Worker Route

Go to **Workers Routes** (or the Worker's **Triggers** tab):

| Route | Worker |
|-------|--------|
| `share.formqo.com/*` | `formqo-share` |

---

## 6. Cloudflare Worker — embed.formqo.com

This Worker serves a lightweight JavaScript snippet that websites embed to display Formqo forms.

### 6.1 Create the Worker

Name: `formqo-embed`

### 6.2 Worker Script

```javascript
// formqo-embed Worker
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Route: GET /{formId}.js
    const match = url.pathname.match(/^\/([a-f0-9-]+)\.js$/i);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const formId = match[1];

    const script = `
(function() {
  var container = document.getElementById("formqo-${formId}");
  if (!container) { console.error("Formqo: container #formqo-${formId} not found"); return; }

  var iframe = document.createElement("iframe");
  iframe.src = "https://share.formqo.com/f/${formId}";
  iframe.style.width = "100%";
  iframe.style.border = "none";
  iframe.style.minHeight = "400px";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Formqo Form");

  // Auto-resize via postMessage (share worker can post height)
  window.addEventListener("message", function(e) {
    if (e.origin === "https://share.formqo.com" && e.data && e.data.formqoHeight) {
      iframe.style.height = e.data.formqoHeight + "px";
    }
  });

  container.appendChild(iframe);
})();
`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript;charset=UTF-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
```

### 6.3 Bind Worker Route

| Route | Worker |
|-------|--------|
| `embed.formqo.com/*` | `formqo-embed` |

### 6.4 Usage

Website owners embed a form with:

```html
<div id="formqo-FORM_ID_HERE"></div>
<script src="https://embed.formqo.com/FORM_ID_HERE.js" async></script>
```

---

## 7. API Proxy — api.formqo.com

With the CNAME `api.formqo.com → vsznqfhfbqqajgexzzky.supabase.co` (DNS-only), all requests to `api.formqo.com` resolve directly to the backend.

### Edge function URLs become:

| Original | Via api.formqo.com |
|----------|-------------------|
| `https://vsznqfhfbqqajgexzzky.supabase.co/functions/v1/submit-form` | `https://api.formqo.com/functions/v1/submit-form` |
| `https://vsznqfhfbqqajgexzzky.supabase.co/functions/v1/issue-csrf` | `https://api.formqo.com/functions/v1/issue-csrf` |
| `https://vsznqfhfbqqajgexzzky.supabase.co/functions/v1/suggest-questions` | `https://api.formqo.com/functions/v1/suggest-questions` |

> **Note**: For this to work, the backend must accept requests with `Host: api.formqo.com`. Most managed backends (including the one powering this project) handle this automatically since they match on the project reference, not the hostname.

> If you need full control or the backend rejects the custom hostname, use a Cloudflare Worker instead:

<details>
<summary>Alternative: API Worker proxy</summary>

```javascript
// formqo-api Worker (optional — only if CNAME approach doesn't work)
const BACKEND_URL = "https://vsznqfhfbqqajgexzzky.supabase.co";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = BACKEND_URL + url.pathname + url.search;

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Override the Host header
    modifiedRequest.headers.set("Host", "vsznqfhfbqqajgexzzky.supabase.co");

    return fetch(modifiedRequest);
  },
};
```

Route: `api.formqo.com/*` → `formqo-api`

If using the Worker approach, change the DNS record for `api` to an A record `192.0.2.1` (Proxied).
</details>

---

## 8. SSL/TLS Settings

In **Cloudflare Dashboard → SSL/TLS**:

### 8.1 Encryption Mode

Set to **Full (Strict)**.

> This ensures Cloudflare encrypts traffic to origin servers and validates their certificates. Only use "Full" (non-strict) if your origin uses self-signed certificates.

### 8.2 Edge Certificates

- **Always Use HTTPS**: ✅ On
- **Minimum TLS Version**: TLS 1.2
- **Automatic HTTPS Rewrites**: ✅ On

### 8.3 HSTS (HTTP Strict Transport Security)

Enable under **SSL/TLS → Edge Certificates → HSTS**:

| Setting | Value |
|---------|-------|
| Enable HSTS | Yes |
| Max-Age | 12 months (31536000) |
| Include subdomains | Yes |
| Preload | Yes (once stable) |
| No-Sniff | Yes |

> ⚠️ Only enable preload once you've confirmed all subdomains work over HTTPS. Preload is difficult to undo.

---

## 9. Email DNS Records

For sending/receiving email from `@formqo.com`, add the following records. Replace placeholder values with those from your email provider (e.g., Google Workspace, Zoho Mail, Fastmail).

### 9.1 MX Records

| Type | Name | Content | Priority | TTL |
|------|------|---------|----------|-----|
| MX | `@` | `mx1.your-email-provider.com` | 10 | Auto |
| MX | `@` | `mx2.your-email-provider.com` | 20 | Auto |

### 9.2 SPF

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `@` | `v=spf1 include:_spf.your-email-provider.com ~all` | Auto |

### 9.3 DKIM

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT or CNAME | `selector._domainkey` | *(provided by your email service)* | Auto |

> The selector name and record type depend on your provider. Common selectors: `google._domainkey`, `zoho._domainkey`, `fm1._domainkey`.

### 9.4 DMARC

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@formqo.com; pct=100` | Auto |

> Start with `p=none` for monitoring, then move to `p=quarantine` or `p=reject` once you've confirmed legitimate emails pass SPF/DKIM.

---

## 10. Verification Checklist

Run these commands after setup to verify each subdomain resolves correctly.

```bash
# 1. Check nameservers
dig NS formqo.com +short
# Should return Cloudflare nameservers

# 2. Root domain
curl -sI https://formqo.com | head -5
# Should return 200 from your marketing site

# 3. www redirect
curl -sI https://www.formqo.com | grep -i location
# Should redirect to https://formqo.com

# 4. App subdomain
dig CNAME app.formqo.com +short
# Should return: formqo.lovable.app.
curl -sI https://app.formqo.com | head -5
# Should return 200

# 5. Share subdomain
curl -s https://share.formqo.com/f/test-id | head -20
# Should return HTML (or 404 for non-existent form)

# 6. Embed subdomain
curl -s https://embed.formqo.com/test-id.js | head -5
# Should return JavaScript

# 7. API subdomain
curl -sI https://api.formqo.com/functions/v1/issue-csrf | head -5
# Should return a response from the backend

# 8. SSL certificate check
echo | openssl s_client -connect app.formqo.com:443 -servername app.formqo.com 2>/dev/null | openssl x509 -noout -subject -dates
# Should show valid certificate

# 9. Email records
dig MX formqo.com +short
dig TXT formqo.com +short   # SPF
dig TXT _dmarc.formqo.com +short  # DMARC
```

### Online Tools

- [DNSChecker.org](https://dnschecker.org) — global DNS propagation
- [MXToolbox](https://mxtoolbox.com) — email record validation
- [SSL Labs](https://www.ssllabs.com/ssltest/) — SSL certificate testing
- [SecurityTrails](https://securitytrails.com) — DNS history

---

## Quick Reference: Order of Operations

1. ✅ Add `formqo.com` to Cloudflare
2. ✅ Update nameservers at registrar
3. ✅ Wait for domain to become active
4. ✅ Add all DNS records (Section 3)
5. ✅ Connect `app.formqo.com` in Lovable (Section 4)
6. ✅ Deploy `formqo-share` Worker (Section 5)
7. ✅ Deploy `formqo-embed` Worker (Section 6)
8. ✅ Configure API access (Section 7)
9. ✅ Set SSL/TLS to Full (Strict) (Section 8)
10. ✅ Add email DNS records (Section 9)
11. ✅ Run verification checklist (Section 10)
