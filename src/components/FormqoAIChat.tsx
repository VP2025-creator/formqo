import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { Question, QuestionType } from "@/types/form";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface AIFormResult {
  title: string;
  description?: string;
  questions: {
    title: string;
    type: QuestionType;
    required: boolean;
    options?: string[];
    description?: string;
  }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  formResult?: AIFormResult;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const EXAMPLE_PROMPTS = [
  "Customer feedback survey for a SaaS product",
  "Job application form for a marketing role",
  "Event registration form with dietary preferences",
  "Bug report form for a mobile app",
];

export default function FormqoAIChat({
  onApplyForm,
}: {
  onApplyForm: (result: {
    title: string;
    description?: string;
    questions: Question[];
  }) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/build-form-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.role === "assistant" && m.formResult
              ? JSON.stringify(m.formResult)
              : m.content,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const formResult = data.form as AIFormResult;

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: `Here's your **${formResult.title}** with ${formResult.questions.length} questions. You can apply it to your form or ask me to make changes.`,
        formResult,
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      // Remove the user message on error so they can retry
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const applyResult = (result: AIFormResult) => {
    const questions: Question[] = result.questions.map((q) => ({
      id: uid(),
      type: q.type,
      title: q.title,
      description: q.description,
      required: q.required,
      options: q.options
        ? q.options.map((label) => ({ id: uid(), label }))
        : q.type === "multiple_choice"
        ? [{ id: uid(), label: "Option 1" }, { id: uid(), label: "Option 2" }]
        : undefined,
      maxRating: q.type === "rating" ? 5 : undefined,
    }));

    onApplyForm({
      title: result.title,
      description: result.description,
      questions,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">
              Build with FormqoAI
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Describe the form you want and I'll generate the questions, types, and flow for you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/3 text-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="space-y-4 max-w-xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 border border-border text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>

                  {msg.formResult && (
                    <div className="mt-3 space-y-2">
                      {/* Question preview list */}
                      <div className="bg-background/60 rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                        {msg.formResult.questions.map((q, qi) => (
                          <div key={qi} className="flex items-center gap-2 px-3 py-2 text-xs">
                            <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {qi + 1}
                            </span>
                            <span className="flex-1 truncate text-foreground font-medium">{q.title}</span>
                            <span className="text-muted-foreground shrink-0">{q.type.replace("_", " ")}</span>
                          </div>
                        ))}
                      </div>

                      {/* Apply button */}
                      <button
                        onClick={() => applyResult(msg.formResult!)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        <ArrowRight size={14} /> Apply to form
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/60 border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Building your form…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        <div className="max-w-xl mx-auto flex items-end gap-2">
          {hasMessages && (
            <button
              onClick={() => setMessages([])}
              className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
              title="Start over"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasMessages ? "Ask for changes…" : "Describe the form you want to build…"}
              rows={1}
              className="w-full resize-none px-4 py-3 pr-12 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              style={{ minHeight: 44, maxHeight: 120 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
