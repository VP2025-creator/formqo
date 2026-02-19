import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title } = await req.json();

    if (!title || title.trim().length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert form designer. Given a form title, suggest 6 highly relevant questions a form creator should include.
Return ONLY valid JSON — an array of objects. Each object must have:
- "title": string (the question text, concise and clear)
- "type": one of "short_text" | "long_text" | "multiple_choice" | "rating" | "email" | "yes_no" | "number" | "date"
- "options": array of strings (only for "multiple_choice", otherwise omit)
- "required": boolean

Example output:
[{"title":"What is your name?","type":"short_text","required":true},{"title":"How satisfied are you?","type":"rating","required":true}]

Do NOT include any markdown, code fences, or explanation. Output raw JSON array only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Form title: "${title.trim()}"`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if model slips up
    const clean = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    let suggestions: unknown[] = [];
    try {
      suggestions = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", clean);
      suggestions = [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-questions error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
