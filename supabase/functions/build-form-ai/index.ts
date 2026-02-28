import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are FormqoAI, an expert form designer. The user will describe the form they want to build — its purpose, audience, or the kind of data they need to collect.

Your job is to generate a complete form definition as JSON. You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code fences).

The JSON object must have:
- "title": string — a clean, professional form title
- "description": string — a short description of the form's purpose (1 sentence)
- "questions": array of question objects

Each question object must have:
- "title": string — the question text
- "type": one of "short_text" | "long_text" | "multiple_choice" | "rating" | "email" | "yes_no" | "number" | "date"
- "required": boolean
- "options": array of strings (ONLY for "multiple_choice" type, otherwise omit this field)
- "description": string (optional — add only when the question needs clarification)

Guidelines:
- Generate 4-10 questions depending on complexity
- Put the most important questions first
- Use appropriate question types (email for emails, rating for satisfaction, etc.)
- For multiple_choice, provide 3-6 realistic options
- Always include at least one required question
- Make question titles clear and concise
- If the user asks for changes to a previously generated form, output the FULL updated form JSON

Output raw JSON only. No markdown. No explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.6,
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
    const content = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if model slips up
    const clean = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    let formData: unknown = null;
    try {
      formData = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", clean);
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ form: formData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("build-form-ai error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
