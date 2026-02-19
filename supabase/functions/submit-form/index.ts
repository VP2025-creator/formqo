/**
 * submit-form edge function
 * Handles ALL public form submissions with:
 *  - CSRF token verification
 *  - Honeypot bot detection
 *  - IP-based rate limiting (10 submissions / IP / form / hour)
 *  - Per-form max-response cap
 *  - Domain allowlist enforcement
 *  - Input sanitization
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token, x-supabase-client-platform, x-supabase-client-platform-version",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitize(val: unknown): unknown {
  if (typeof val === "string") {
    // Strip null bytes; limit to 10 000 chars
    return val.replace(/\0/g, "").slice(0, 10_000).trim();
  }
  if (Array.isArray(val)) return val.map(sanitize);
  return val;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service-role client (bypasses RLS for rate-limit & csrf writes)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { formId, answers, csrfToken, honeypot, referrer } = body as {
      formId?: string;
      answers?: unknown[];
      csrfToken?: string;
      honeypot?: string;
      referrer?: string;
    };

    // ── 2. Basic presence checks ─────────────────────────────────────────────
    if (!formId || typeof formId !== "string") {
      return new Response(JSON.stringify({ error: "formId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Honeypot check (bot detection) ────────────────────────────────────
    // Field named "website" is hidden from real users; bots fill it in.
    if (honeypot && String(honeypot).trim().length > 0) {
      console.warn("Honeypot triggered for form", formId);
      // Silently accept but do NOT record — don't let bots know they failed
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. CSRF token verification ───────────────────────────────────────────
    if (!csrfToken || typeof csrfToken !== "string") {
      return new Response(JSON.stringify({ error: "Missing CSRF token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("csrf_tokens")
      .select("token, form_id, created_at, used")
      .eq("token", csrfToken)
      .eq("form_id", formId)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.used) {
      return new Response(JSON.stringify({ error: "CSRF token already used" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Token must be < 2 hours old
    const tokenAge = Date.now() - new Date(tokenRow.created_at).getTime();
    if (tokenAge > 2 * 60 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "CSRF token expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark token as used immediately (prevents replay)
    await supabaseAdmin
      .from("csrf_tokens")
      .update({ used: true })
      .eq("token", csrfToken);

    // ── 5. Load form (verify it exists + is active) ──────────────────────────
    const { data: form, error: formErr } = await supabaseAdmin
      .from("forms")
      .select("id, status, max_responses, allowed_domains, captcha_enabled, user_id")
      .eq("id", formId)
      .single();

    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (form.status !== "active") {
      return new Response(JSON.stringify({ error: "This form is not accepting responses" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 6. Domain allowlist check ────────────────────────────────────────────
    const allowedDomains = form.allowed_domains as string[] | null;
    if (allowedDomains && allowedDomains.length > 0 && referrer) {
      try {
        const refHost = new URL(String(referrer)).hostname.replace(/^www\./, "");
        const allowed = allowedDomains.some((d) =>
          refHost === d.replace(/^www\./, "") ||
          refHost.endsWith("." + d.replace(/^www\./, ""))
        );
        if (!allowed) {
          return new Response(
            JSON.stringify({ error: "Submissions from this domain are not permitted" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // Malformed referrer — block it
        return new Response(
          JSON.stringify({ error: "Invalid referrer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 7. Per-form max-responses cap ────────────────────────────────────────
    if (form.max_responses !== null && form.max_responses > 0) {
      const { count } = await supabaseAdmin
        .from("form_responses")
        .select("*", { count: "exact", head: true })
        .eq("form_id", formId);

      if ((count ?? 0) >= form.max_responses) {
        return new Response(
          JSON.stringify({ error: "This form has reached its response limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 8. IP-based rate limiting (10 / IP / form / hour) ───────────────────
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";
    const ipHash = await sha256hex(ip + formId); // combine with formId for uniqueness

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("submission_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("ip_hash", ipHash)
      .gte("submitted_at", oneHourAgo);

    const RATE_LIMIT = 10; // submissions per IP per form per hour
    if ((recentCount ?? 0) >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 9. Sanitize answers ──────────────────────────────────────────────────
    const sanitizedAnswers = Array.isArray(answers)
      ? answers.map((a) => {
          if (typeof a === "object" && a !== null) {
            const entry = a as Record<string, unknown>;
            return { ...entry, value: sanitize(entry.value) };
          }
          return a;
        })
      : [];

    // ── 10. Insert response ──────────────────────────────────────────────────
    const { error: insertErr } = await supabaseAdmin.from("form_responses").insert({
      form_id: formId,
      answers: sanitizedAnswers,
      completed: true,
      metadata: {
        submitted_via: "share.formqo.com",
        referrer: referrer ?? null,
        ip_hash: ipHash,
      },
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to record response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 11. Record rate-limit entry ──────────────────────────────────────────
    await supabaseAdmin.from("submission_rate_limits").insert({
      form_id: formId,
      ip_hash: ipHash,
    });

    // ── 12. Clean up old rate-limit records (> 24 h) ─────────────────────────
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("submission_rate_limits")
      .delete()
      .lt("submitted_at", yesterday);

    // ── 13. Clean up old CSRF tokens (> 4 h) ─────────────────────────────────
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("csrf_tokens")
      .delete()
      .lt("created_at", fourHoursAgo);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-form error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
