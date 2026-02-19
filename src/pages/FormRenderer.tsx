import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Check } from "lucide-react";
import { getFormById } from "@/data/mockForms";
import { Form, Question, FormResponse } from "@/types/form";

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
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 font-display ${
            canProceed
              ? "bg-white text-foreground hover:bg-white/90 hover:scale-105"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {isLast ? "Submit" : "OK"}
          <ArrowRight size={15} />
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

function WelcomeScreen({ form, onStart }: { form: Form; onStart: () => void }) {
  return (
    <div className="animate-fade-up min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24">
      <div className="max-w-2xl">
        <p className="text-white/40 text-sm font-body uppercase tracking-widest mb-6">
          {form.questions.length} questions · ~2 min
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-white/55 text-lg md:text-xl font-body mb-10 leading-relaxed">
            {form.description}
          </p>
        )}
        <button
          onClick={onStart}
          className="flex items-center gap-2 bg-white text-foreground px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/90 hover:scale-105 transition-all duration-200 font-display"
        >
          Start <ArrowRight size={16} />
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
  const form = getFormById(formId ?? "");

  const [screen, setScreen] = useState<Screen>("welcome");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [animKey, setAnimKey] = useState("welcome");

  const go = (idx: number) => {
    setCurrentIdx(idx);
    setAnimKey(`q-${idx}-${Date.now()}`);
  };

  const handleNext = () => {
    if (currentIdx < (form?.questions.length ?? 0) - 1) {
      go(currentIdx + 1);
    } else {
      setScreen("thankyou");
      setAnimKey(`ty-${Date.now()}`);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) go(currentIdx - 1);
  };

  const handleStart = () => {
    setScreen("questions");
    setAnimKey(`q-0-${Date.now()}`);
  };

  // Enter key on welcome/thankyou
  useEffect(() => {
    if (screen !== "questions") {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Enter" && screen === "welcome") handleStart();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
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

  if (!form) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-3">Form not found</h1>
          <p className="text-white/50 mb-6">This form may have been closed or doesn't exist.</p>
          <Link to="/" className="btn-primary">Back to Formqo</Link>
        </div>
      </div>
    );
  }

  if (form.status === "closed") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "hsl(var(--foreground))" }}
      >
        <div className="text-center px-8">
          <h1 className="font-display text-3xl font-bold mb-3 text-white">This form is closed</h1>
          <p className="text-white/50 mb-6">The creator has stopped accepting responses.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            ← Back to Formqo
          </Link>
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

      {screen === "welcome" && <WelcomeScreen form={form} onStart={handleStart} />}

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
