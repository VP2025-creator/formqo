import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Check, Loader2 } from "lucide-react";
import { Form, Question, FormResponse } from "@/types/form";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const EDGE_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

// Fetch a CSRF token before the form is submitted
async function fetchCsrfToken(formId: string): Promise<string | null> {
  try {
    const res = await fetch(`${EDGE_BASE}/issue-csrf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId }),
    });
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  multiple_choice: "Multiple choice",
  rating: "Rating",
  email: "Email",
  yes_no: "Yes / No",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  phone: "Phone number",
  website: "Website",
  address: "Address",
  checkbox: "Checkbox",
  legal: "Legal",
  opinion_scale: "Opinion scale",
  nps: "Net Promoter Score",
  ranking: "Ranking",
  picture_choice: "Picture choice",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current) / total) * 100);
  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/10 z-50">
      <div
        className="h-full bg-white transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RatingInput({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex gap-3 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`w-14 h-14 rounded-xl text-xl font-bold border-2 transition-all duration-150 ${
            (hovered !== null ? n <= hovered : value !== null && n <= value)
              ? "border-white bg-white text-foreground scale-110"
              : "border-white/30 bg-white/10 text-white hover:border-white/60"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function MultipleChoiceInput({
  options,
  allowMultiple,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  allowMultiple: boolean;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (allowMultiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange([id]);
    }
  };

  return (
    <div className="space-y-3 w-full max-w-lg">
      {options.map((opt, idx) => {
        const selected = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all duration-150 ${
              selected
                ? "border-white bg-white text-foreground"
                : "border-white/25 bg-white/8 text-white hover:border-white/50 hover:bg-white/12"
            }`}
          >
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-md border-2 text-xs font-bold shrink-0 transition-colors ${
                selected ? "border-primary bg-primary text-primary-foreground" : "border-white/40 text-white/60"
              }`}
            >
              {selected ? <Check size={13} /> : String.fromCharCode(65 + idx)}
            </span>
            <span className="font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function YesNoInput({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-4">
      {["Yes", "No"].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-150 ${
            value === opt
              ? "border-white bg-white text-foreground"
              : "border-white/25 bg-white/8 text-white hover:border-white/50"
          }`}
        >
          <span className={`flex items-center justify-center w-7 h-7 rounded-md border-2 text-xs font-bold ${
            value === opt ? "border-primary bg-primary text-primary-foreground" : "border-white/40 text-white/60"
          }`}>
            {opt === "Yes" ? "Y" : "N"}
          </span>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Question Screen ─────────────────────────────────────────────────────────

function QuestionScreen({
  question,
  index,
  total,
  value,
  onChange,
  onNext,
  onPrev,
  isFirst,
  isLast,
  animKey,
  isSubmitting = false,
}: {
  question: Question;
  index: number;
  total: number;
  value: FormResponse | undefined;
  onChange: (r: FormResponse) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  animKey: string;
  isSubmitting?: boolean;
}) {
  const hasValue = () => {
    if (!value) return false;
    if (Array.isArray(value.value)) return value.value.length > 0;
    if (typeof value.value === "number") return true;
    return String(value.value).trim().length > 0;
  };

  const canProceed = !question.required || hasValue();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && question.type !== "long_text" && canProceed) {
        onNext();
      }
    },
    [onNext, canProceed, question.type]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const inputClasses =
    "bg-transparent border-b-2 border-white/30 focus:border-white text-white placeholder-white/35 text-xl py-3 w-full max-w-lg outline-none transition-colors duration-200 font-body";

  return (
    <div
      key={animKey}
      className="animate-fade-up min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24"
      style={{ animationDuration: "0.45s" }}
    >
      {/* Question number */}
      <div className="flex items-center gap-2 mb-6 text-white/50 text-sm font-body">
        <span className="font-semibold text-white">{index + 1}</span>
        <ArrowRight size={13} className="text-white/40" />
        <span>{QUESTION_TYPE_LABELS[question.type]}</span>
      </div>

      {/* Title */}
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3 max-w-2xl">
        {question.required && <span className="text-primary mr-1">*</span>}
        {question.title}
      </h2>

      {/* Description */}
      {question.description && (
        <p className="text-white/55 text-base md:text-lg mb-8 max-w-lg font-body">{question.description}</p>
      )}

      {/* Input */}
      <div className="mb-8">
        {question.type === "short_text" && (
          <input
            autoFocus
            type="text"
            placeholder={question.placeholder || "Type your answer here..."}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={inputClasses}
          />
        )}

        {question.type === "long_text" && (
          <textarea
            autoFocus
            rows={4}
            placeholder={question.placeholder || "Type your answer here..."}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={`${inputClasses} resize-none border-2 rounded-xl p-4 border-white/30 focus:border-white`}
          />
        )}

        {question.type === "email" && (
          <input
            autoFocus
            type="email"
            placeholder={question.placeholder || "name@example.com"}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={inputClasses}
          />
        )}

        {question.type === "number" && (
          <input
            autoFocus
            type="number"
            placeholder={question.placeholder || "Enter a number..."}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={inputClasses}
          />
        )}

        {question.type === "date" && (
          <input
            autoFocus
            type="date"
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={`${inputClasses} [color-scheme:dark]`}
          />
        )}

        {question.type === "rating" && (
          <RatingInput
            max={question.maxRating ?? 5}
            value={value?.value as number | null ?? null}
            onChange={(v) => onChange({ questionId: question.id, value: v })}
          />
        )}

        {question.type === "multiple_choice" && question.options && (
          <MultipleChoiceInput
            options={question.options}
            allowMultiple={question.allowMultiple ?? false}
            value={(value?.value as string[]) ?? []}
            onChange={(v) => onChange({ questionId: question.id, value: v })}
          />
        )}

        {question.type === "yes_no" && (
          <YesNoInput
            value={value?.value as string | null ?? null}
            onChange={(v) => onChange({ questionId: question.id, value: v })}
          />
        )}

        {/* Phone */}
        {question.type === "phone" && (
          <input
            autoFocus
            type="tel"
            placeholder={question.placeholder || "+1 (555) 000-0000"}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={inputClasses}
          />
        )}

        {/* Website */}
        {question.type === "website" && (
          <input
            autoFocus
            type="url"
            placeholder={question.placeholder || "https://example.com"}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={inputClasses}
          />
        )}

        {/* Address */}
        {question.type === "address" && (
          <textarea
            autoFocus
            rows={3}
            placeholder={question.placeholder || "Street, City, State, ZIP"}
            value={String(value?.value ?? "")}
            onChange={(e) => onChange({ questionId: question.id, value: e.target.value })}
            className={`${inputClasses} resize-none border-2 rounded-xl p-4 border-white/30 focus:border-white`}
          />
        )}

        {/* Checkbox (multi-select like multiple_choice) */}
        {question.type === "checkbox" && question.options && (
          <MultipleChoiceInput
            options={question.options}
            allowMultiple={true}
            value={(value?.value as string[]) ?? []}
            onChange={(v) => onChange({ questionId: question.id, value: v })}
          />
        )}

        {/* Dropdown */}
        {question.type === "dropdown" && question.options && (
          <div className="space-y-2 w-full max-w-lg">
            {question.options.map((opt) => {
              const selected = value?.value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ questionId: question.id, value: opt.id })}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all duration-150 ${
                    selected
                      ? "border-white bg-white text-foreground"
                      : "border-white/25 bg-white/8 text-white hover:border-white/50 hover:bg-white/12"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {selected && <Check size={16} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Legal (accept / decline) */}
        {question.type === "legal" && (
          <div className="flex gap-4">
            {["Accept", "Decline"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ questionId: question.id, value: opt })}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-150 ${
                  value?.value === opt
                    ? "border-white bg-white text-foreground"
                    : "border-white/25 bg-white/8 text-white hover:border-white/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Opinion Scale */}
        {question.type === "opinion_scale" && (
          <div>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: question.scaleMax ?? 5 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ questionId: question.id, value: n })}
                  className={`w-14 h-14 rounded-xl text-xl font-bold border-2 transition-all duration-150 ${
                    value?.value === n
                      ? "border-white bg-white text-foreground scale-110"
                      : "border-white/30 bg-white/10 text-white hover:border-white/60"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {question.scaleLabels && (
              <div className="flex justify-between mt-2 text-white/40 text-xs font-body max-w-lg">
                <span>{question.scaleLabels.start}</span>
                <span>{question.scaleLabels.end}</span>
              </div>
            )}
          </div>
        )}

        {/* NPS */}
        {question.type === "nps" && (
          <div>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ questionId: question.id, value: n })}
                  className={`w-12 h-12 rounded-xl text-lg font-bold border-2 transition-all duration-150 ${
                    value?.value === n
                      ? "border-white bg-white text-foreground scale-110"
                      : "border-white/30 bg-white/10 text-white hover:border-white/60"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-white/40 text-xs font-body">
              <span>{question.scaleLabels?.start ?? "Not likely"}</span>
              <span>{question.scaleLabels?.end ?? "Very likely"}</span>
            </div>
          </div>
        )}

        {/* Ranking */}
        {question.type === "ranking" && question.options && (
          <div className="space-y-2 w-full max-w-lg">
            <p className="text-white/40 text-xs mb-2 font-body">Drag to reorder (click to select order)</p>
            {question.options.map((opt, idx) => (
              <div
                key={opt.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-white/25 bg-white/8 text-white"
              >
                <span className="w-7 h-7 rounded-md border-2 border-white/40 flex items-center justify-center text-xs font-bold text-white/60">
                  {idx + 1}
                </span>
                <span className="font-medium">{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Picture choice */}
        {question.type === "picture_choice" && question.options && (
          <MultipleChoiceInput
            options={question.options}
            allowMultiple={question.allowMultiple ?? false}
            value={(value?.value as string[]) ?? []}
            onChange={(v) => onChange({ questionId: question.id, value: v })}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 font-display ${
            canProceed
              ? "bg-white text-foreground hover:bg-white/90 hover:scale-105"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
          {isLast ? "Submit" : "OK"}
          {!isSubmitting && <ArrowRight size={15} />}
        </button>
        {question.type !== "long_text" && canProceed && (
          <span className="text-white/30 text-xs font-body hidden sm:block">
            press <kbd className="font-semibold text-white/50">Enter ↵</kbd>
          </span>
        )}
      </div>

      {/* Prev / Next nav */}
      {!isFirst && (
        <div className="mt-6 flex gap-2">
          <button
            onClick={onPrev}
            className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors font-body"
          >
            <ArrowLeft size={12} /> Previous
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────────────────

function WelcomeScreen({ form, onStart, isPreview }: { form: Form; onStart: () => void; isPreview: boolean }) {
  const ws = form.settings.welcomeScreen;
  const title = ws?.title || form.title;
  const description = ws?.description || form.description;
  const buttonText = ws?.buttonText || "Start";

  // Convert YouTube watch URLs to embed
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url; // assume already an embed URL
  };

  return (
    <div className="animate-fade-up min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24">
      {isPreview && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
          Preview mode — responses won't be saved
        </div>
      )}
      <div className="max-w-2xl">
        <p className="text-white/40 text-sm font-body uppercase tracking-widest mb-6">
          {form.questions.length} questions · ~2 min
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
          {title}
        </h1>
        {description && (
          <p className="text-white/55 text-lg md:text-xl font-body mb-8 leading-relaxed">
            {description}
          </p>
        )}

        {/* Welcome image */}
        {ws?.imageUrl && (
          <div className="mb-8 rounded-xl overflow-hidden max-w-lg">
            <img
              src={ws.imageUrl}
              alt="Welcome"
              className="w-full h-auto object-cover rounded-xl"
              loading="lazy"
            />
          </div>
        )}

        {/* Embedded video */}
        {ws?.videoUrl && (
          <div className="mb-8 rounded-xl overflow-hidden max-w-lg aspect-video">
            <iframe
              src={getEmbedUrl(ws.videoUrl)}
              title="Welcome video"
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <button
          onClick={onStart}
          className="flex items-center gap-2 bg-white text-foreground px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/90 hover:scale-105 transition-all duration-200 font-display"
        >
          {buttonText} <ArrowRight size={16} />
        </button>
        <p className="mt-4 text-white/25 text-xs font-body">
          press <kbd className="text-white/40 font-semibold">Enter ↵</kbd> to begin
        </p>
      </div>
    </div>
  );
}

// ─── Thank You Screen ────────────────────────────────────────────────────────

function ThankYouScreen({ form }: { form: Form }) {
  return (
    <div className="animate-fade-up min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24">
      <div className="max-w-xl">
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-8">
          <Check size={28} className="text-white" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          {form.settings.thankYouTitle ?? "Thank you!"}
        </h1>
        <p className="text-white/55 text-lg font-body mb-10">
          {form.settings.thankYouMessage ?? "Your response has been recorded."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors font-body"
        >
          ← Back to Formqo
        </Link>
      </div>
    </div>
  );
}

// ─── Navigation arrows (bottom-right) ───────────────────────────────────────

function NavArrows({
  onUp,
  onDown,
  canUp,
  canDown,
}: {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-1 z-50">
      <button
        onClick={onUp}
        disabled={!canUp}
        className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
          canUp ? "border-white/30 text-white/60 hover:border-white hover:text-white" : "border-white/10 text-white/15 cursor-not-allowed"
        }`}
      >
        <ArrowUp size={14} />
      </button>
      <button
        onClick={onDown}
        disabled={!canDown}
        className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
          canDown ? "border-white/30 text-white/60 hover:border-white hover:text-white" : "border-white/10 text-white/15 cursor-not-allowed"
        }`}
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Screen = "welcome" | "questions" | "thankyou";

const FormRenderer = () => {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const [form, setForm] = useState<Form | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>("welcome");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [animKey, setAnimKey] = useState("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const csrfTokenRef = useRef<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Load form from DB
  useEffect(() => {
    if (!formId) return;
    const load = async () => {
      setFormLoading(true);
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error || !data) {
        setFormError("not_found");
        setFormLoading(false);
        return;
      }

      // If not preview mode, only allow active forms
      if (!isPreview && data.status !== "active") {
        setFormError(data.status === "closed" ? "closed" : "inactive");
        setFormLoading(false);
        return;
      }

      const mapped: Form = {
        id: data.id,
        title: data.title,
        description: data.description ?? undefined,
        questions: (data.questions as unknown as Question[]) ?? [],
        settings: (data.settings as unknown as Form["settings"]) ?? {
          primaryColor: "hsl(357 95% 22%)",
          showBranding: true,
        },
        status: data.status as Form["status"],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setForm(mapped);
      setFormLoading(false);
    };
    load();
  }, [formId, isPreview]);

  // Pre-fetch CSRF token
  useEffect(() => {
    if (formId && !isPreview) {
      fetchCsrfToken(formId).then((token) => {
        csrfTokenRef.current = token;
      });
    }
  }, [formId, isPreview]);

  const go = (idx: number) => {
    setCurrentIdx(idx);
    setAnimKey(`q-${idx}-${Date.now()}`);
  };

  const handleSubmit = async () => {
    if (!form || !formId) return;

    // In preview mode, just show thank-you without saving
    if (isPreview) {
      setScreen("thankyou");
      setAnimKey(`ty-${Date.now()}`);
      return;
    }

    setIsSubmitting(true);

    let token = csrfTokenRef.current;
    if (!token) {
      token = await fetchCsrfToken(formId);
      csrfTokenRef.current = token;
    }

    try {
      const res = await fetch(`${EDGE_BASE}/submit-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          answers: responses,
          csrfToken: token,
          honeypot,
          referrer: window.location.href,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Submission failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setScreen("thankyou");
      setAnimKey(`ty-${Date.now()}`);
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!form) return;
    if (currentIdx < form.questions.length - 1) {
      go(currentIdx + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) go(currentIdx - 1);
  };

  const handleStart = () => {
    setScreen("questions");
    setAnimKey(`q-0-${Date.now()}`);
  };

  // Enter key on welcome
  useEffect(() => {
    if (screen !== "questions") {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Enter" && screen === "welcome") handleStart();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const setResponse = (r: FormResponse) => {
    setResponses((prev) => {
      const existing = prev.findIndex((p) => p.questionId === r.questionId);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = r;
        return next;
      }
      return [...prev, r];
    });
  };

  // Loading state
  if (formLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--foreground))" }}>
        <Loader2 size={28} className="text-white/40 animate-spin" />
      </div>
    );
  }

  // Error states
  if (formError === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--foreground))" }}>
        <div className="text-center px-8">
          <h1 className="font-display text-3xl font-bold mb-3 text-white">This form is closed</h1>
          <p className="text-white/50 mb-6">The creator has stopped accepting responses.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">← Back to Formqo</Link>
        </div>
      </div>
    );
  }

  if (formError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--foreground))" }}>
        <div className="text-center px-8">
          <h1 className="font-display text-3xl font-bold mb-3 text-white">Form not found</h1>
          <p className="text-white/50 mb-6">This form may have been closed or doesn't exist.</p>
          <Link to="/" className="btn-primary">Back to Formqo</Link>
        </div>
      </div>
    );
  }

  const currentQuestion = form.questions[currentIdx];
  const currentResponse = responses.find((r) => r.questionId === currentQuestion?.id);

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: "hsl(var(--foreground))" }}
    >
      {/* Honeypot field */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />

      {/* Progress bar */}
      {screen === "questions" && (
        <ProgressBar current={currentIdx + 1} total={form.questions.length} />
      )}

      {/* Branding */}
      {form.settings.showBranding && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-white/25 hover:text-white/50 text-xs transition-colors font-body"
          >
            Powered by
            <span className="font-display font-bold text-white/40">Formqo</span>
          </Link>
        </div>
      )}

      {/* Submission error overlay */}
      {errorMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full text-center shadow-xl">
            <h2 className="font-display font-bold text-xl text-foreground mb-3">Submission failed</h2>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="btn-primary w-full">Try again</button>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <Loader2 size={32} className="text-white animate-spin" />
        </div>
      )}

      {screen === "welcome" && <WelcomeScreen form={form} onStart={handleStart} isPreview={isPreview} />}

      {screen === "questions" && currentQuestion && (
        <>
          <QuestionScreen
            key={animKey}
            question={currentQuestion}
            index={currentIdx}
            total={form.questions.length}
            value={currentResponse}
            onChange={setResponse}
            onNext={handleNext}
            onPrev={handlePrev}
            isFirst={currentIdx === 0}
            isLast={currentIdx === form.questions.length - 1}
            animKey={animKey}
            isSubmitting={isSubmitting}
          />
          <NavArrows
            onUp={handlePrev}
            onDown={handleNext}
            canUp={currentIdx > 0}
            canDown={true}
          />
        </>
      )}

      {screen === "thankyou" && <ThankYouScreen key={animKey} form={form} />}
    </div>
  );
};

export default FormRenderer;
