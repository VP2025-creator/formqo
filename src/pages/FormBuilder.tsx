import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, GripVertical, ChevronDown, Eye,
  AlignLeft, AlignJustify, List, Star, Mail, ToggleLeft,
  Hash, Calendar, ChevronRight, ChevronUp, ArrowLeft, ArrowRight,
  Settings, Share2, Check, X, MoreHorizontal, Smartphone, Monitor,
  Sparkles, Loader2, Copy, Code2, Link2, QrCode, Menu, Layers, FileText,
  Phone, Globe, MapPin, CheckSquare, Scale, BarChart3, Gauge, ArrowUpDown, Image,
  PlayCircle, Upload,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Question, QuestionType, Form, QuestionOption } from "@/types/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile.tsx";
import FormqoAIChat from "@/components/FormqoAIChat";

import { getShareUrl, getEmbedSnippet } from "@/lib/urls";

// ─── Question type config ────────────────────────────────────────────────────

// ─── Question type categories (matching Tally-style layout) ──────────────────

interface QuestionTypeConfig {
  type: QuestionType;
  label: string;
  icon: React.ElementType;
  description: string;
  category: "Contact info" | "Choice" | "Rating & ranking" | "Text & Video" | "Other";
}

const QUESTION_TYPES: QuestionTypeConfig[] = [
  // Contact info
  { type: "email",           label: "Email",           icon: Mail,         description: "Email address",        category: "Contact info" },
  { type: "phone",           label: "Phone Number",    icon: Phone,        description: "Phone number input",   category: "Contact info" },
  { type: "address",         label: "Address",         icon: MapPin,       description: "Full address",         category: "Contact info" },
  { type: "website",         label: "Website",         icon: Globe,        description: "URL input",            category: "Contact info" },
  // Choice
  { type: "multiple_choice", label: "Multiple Choice", icon: List,         description: "Select from options",  category: "Choice" },
  { type: "dropdown",        label: "Dropdown",        icon: ChevronDown,  description: "Dropdown select",      category: "Choice" },
  { type: "picture_choice",  label: "Picture Choice",  icon: Image,        description: "Choose with images",   category: "Choice" },
  { type: "yes_no",          label: "Yes / No",        icon: ToggleLeft,   description: "Boolean choice",       category: "Choice" },
  { type: "legal",           label: "Legal",           icon: Scale,        description: "Terms acceptance",      category: "Choice" },
  { type: "checkbox",        label: "Checkbox",        icon: CheckSquare,  description: "Multi-select checks",  category: "Choice" },
  // Rating & ranking
  { type: "nps",             label: "Net Promoter Score", icon: Gauge,     description: "NPS 0–10 scale",       category: "Rating & ranking" },
  { type: "opinion_scale",   label: "Opinion Scale",   icon: BarChart3,    description: "Likert-style scale",   category: "Rating & ranking" },
  { type: "rating",          label: "Rating",          icon: Star,         description: "1–5 or 1–10 scale",    category: "Rating & ranking" },
  { type: "ranking",         label: "Ranking",         icon: ArrowUpDown,  description: "Order items by pref",  category: "Rating & ranking" },
  // Text & Video
  { type: "long_text",       label: "Long Text",       icon: AlignJustify, description: "Multi-line answer",    category: "Text & Video" },
  { type: "short_text",      label: "Short Text",      icon: AlignLeft,    description: "Single line answer",   category: "Text & Video" },
  // Other
  { type: "number",          label: "Number",          icon: Hash,         description: "Numeric input",        category: "Other" },
  { type: "date",            label: "Date",            icon: Calendar,     description: "Date picker",          category: "Other" },
  { type: "file_upload",     label: "File Upload",     icon: Upload,       description: "Attach files",         category: "Other" },
];

const TYPE_ICONS: Record<QuestionType, React.ElementType> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.type, t.icon])
) as Record<QuestionType, React.ElementType>;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultQuestion(type: QuestionType): Question {
  const base: Question = {
    id: uid(),
    type,
    title: "",
    required: false,
  };
  if (["multiple_choice", "dropdown", "checkbox", "picture_choice", "ranking"].includes(type)) {
    base.options = [
      { id: uid(), label: "Option 1" },
      { id: uid(), label: "Option 2" },
    ];
  }
  if (type === "rating") base.maxRating = 5;
  if (type === "multiple_choice" || type === "checkbox" || type === "picture_choice") base.allowMultiple = false;
  if (type === "opinion_scale") { base.scaleMax = 5; base.scaleLabels = { start: "Disagree", end: "Agree" }; }
  if (type === "nps") { base.scaleMax = 10; base.scaleLabels = { start: "Not likely", end: "Very likely" }; }
  if (type === "legal") base.title = "I agree to the terms and conditions";
  if (type === "file_upload") {
    base.maxFileSize = 10;
    base.acceptedFileTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
  }
  return base;
}

// ─── AI Suggestion types ─────────────────────────────────────────────────────

interface AISuggestion {
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

// ─── Share Modal ─────────────────────────────────────────────────────────────

function ShareModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [tab, setTab] = useState<"link" | "embed" | "qr">("link");
  const shareUrl = getShareUrl(form.id);
  const embedSnippet = getEmbedSnippet(form.id);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg">Share form</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{form.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-border px-6">
          {(["link", "embed", "qr"] as const).map((t) => {
            const icons = { link: Link2, embed: Code2, qr: QrCode };
            const labels = { link: "Link", embed: "Embed", qr: "QR Code" };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} /> {labels[t]}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-6">
          {tab === "link" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Public URL</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Hosted on <span className="font-mono font-medium text-foreground">share.formqo.com</span> — fully rendered with OG tags and canonical URLs.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm font-mono text-foreground truncate">
                    {shareUrl}
                  </div>
                  <button
                    onClick={() => copy(shareUrl, "Link")}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium shrink-0"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl btn-primary text-sm font-semibold"
              >
                <Eye size={14} /> Open form
              </a>
            </div>
          )}

          {tab === "embed" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Embed snippet</label>
                <div className="relative">
                  <pre className="px-4 py-4 rounded-xl border border-border bg-foreground text-green-400 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                    {embedSnippet}
                  </pre>
                  <button
                    onClick={() => copy(embedSnippet, "Embed code")}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "qr" && (
            <div className="flex flex-col items-center gap-5">
              <div className="p-5 bg-white rounded-2xl border border-border shadow-sm">
                <QRCodeSVG value={shareUrl} size={200} bgColor="#ffffff" fgColor="#1a1a2e" level="M" includeMargin={false} />
              </div>
              <p className="text-xs text-muted-foreground font-mono text-center break-all max-w-xs">{shareUrl}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Suggestion Panel ─────────────────────────────────────────────────────

function AISuggestionPanel({
  suggestions, loading, error, onAdd, onAddAll, onDismiss,
}: {
  suggestions: AISuggestion[];
  loading: boolean;
  error: string | null;
  onAdd: (s: AISuggestion) => void;
  onAddAll: () => void;
  onDismiss: () => void;
}) {
  if (!loading && suggestions.length === 0 && !error) return null;

  return (
    <div className="border border-primary/20 bg-primary/3 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <div className="flex items-center gap-1.5 flex-1">
          <Sparkles size={13} className="text-primary" />
          <span className="text-xs font-semibold text-primary">AI suggestions</span>
          {loading && <Loader2 size={11} className="text-primary animate-spin" />}
        </div>
        {suggestions.length > 0 && !loading && (
          <button onClick={onAddAll} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            Add all
          </button>
        )}
        <button onClick={onDismiss} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X size={12} />
        </button>
      </div>

      {loading && (
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Generating questions…</span>
        </div>
      )}

      {error && <div className="px-4 py-3 text-xs text-destructive">{error}</div>}

      {!loading && suggestions.length > 0 && (
        <div className="divide-y divide-border/50">
          {suggestions.map((s, i) => {
            const Icon = TYPE_ICONS[s.type] ?? AlignLeft;
            const typeDef = QUESTION_TYPES.find(t => t.type === s.type);
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 group hover:bg-primary/5 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={11} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{s.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{typeDef?.label}</span>
                    {s.required && <span className="text-xs text-primary font-medium">required</span>}
                  </div>
                </div>
                <button
                  onClick={() => onAdd(s)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-all shrink-0 mt-0.5"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Question Type Picker ────────────────────────────────────────────────────

function TypePicker({ current, onChange }: { current: QuestionType; onChange: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const currentDef = QUESTION_TYPES.find((t) => t.type === current);
  const Icon = currentDef ? currentDef.icon : AlignLeft;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm font-medium hover:border-primary/40 transition-colors w-full"
      >
        <Icon size={14} className="text-primary" />
        <span className="flex-1 text-left">{currentDef?.label}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {QUESTION_TYPES.map((t) => {
            const TIcon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => { onChange(t.type); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left ${t.type === current ? "bg-primary/5" : ""}`}
              >
                <TIcon size={14} className={t.type === current ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                {t.type === current && <Check size={13} className="text-primary ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Options Editor ──────────────────────────────────────────────────────────

function OptionsEditor({ options, onChange }: { options: QuestionOption[]; onChange: (o: QuestionOption[]) => void }) {
  const update = (id: string, label: string) => onChange(options.map((o) => (o.id === id ? { ...o, label } : o)));
  const remove = (id: string) => onChange(options.filter((o) => o.id !== id));
  const add = () => onChange([...options, { id: uid(), label: `Option ${options.length + 1}` }]);

  return (
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <div key={opt.id} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 shrink-0 font-medium">{String.fromCharCode(65 + idx)}</span>
          <input
            value={opt.label}
            onChange={(e) => update(opt.id, e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button onClick={() => remove(opt.id)} className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors">
            <X size={13} />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1 font-medium">
        <Plus size={12} /> Add option
      </button>
    </div>
  );
}

// ─── Question Editor Panel ───────────────────────────────────────────────────

function QuestionEditor({ question, index, onChange }: { question: Question; index: number; onChange: (q: Question) => void }) {
  const update = (partial: Partial<Question>) => onChange({ ...question, ...partial });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-muted-foreground">Question {index + 1}</span>
        <TypePicker
          current={question.type}
          onChange={(type) => {
            const defaults = defaultQuestion(type);
            update({ type, options: defaults.options, maxRating: defaults.maxRating, allowMultiple: defaults.allowMultiple });
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Question title *</label>
        <input
          value={question.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Type your question..."
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground font-display font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Description <span className="font-normal normal-case">(optional)</span>
        </label>
        <input
          value={question.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Add a helpful description..."
          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {["short_text", "long_text", "email", "number", "phone", "website", "address"].includes(question.type) && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Placeholder</label>
          <input
            value={question.placeholder ?? ""}
            onChange={(e) => update({ placeholder: e.target.value })}
            placeholder="e.g. Type your answer here..."
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      )}

      {["multiple_choice", "dropdown", "checkbox", "picture_choice", "ranking"].includes(question.type) && question.options && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Options</label>
          <OptionsEditor options={question.options} onChange={(opts) => update({ options: opts })} />
          {["multiple_choice", "checkbox", "picture_choice"].includes(question.type) && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <div
                onClick={() => update({ allowMultiple: !question.allowMultiple })}
                className={`w-9 h-5 rounded-full transition-colors relative ${question.allowMultiple ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${question.allowMultiple ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-foreground">Allow multiple selections</span>
            </label>
          )}
        </div>
      )}

      {(question.type === "opinion_scale" || question.type === "nps") && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Scale max</label>
            <div className="flex gap-2">
              {(question.type === "nps" ? [10] : [3, 5, 7, 10]).map((n) => (
                <button
                  key={n}
                  onClick={() => update({ scaleMax: n })}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    question.scaleMax === n ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Start label</label>
              <input
                value={question.scaleLabels?.start ?? ""}
                onChange={(e) => update({ scaleLabels: { ...question.scaleLabels, start: e.target.value } })}
                placeholder="e.g. Disagree"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">End label</label>
              <input
                value={question.scaleLabels?.end ?? ""}
                onChange={(e) => update({ scaleLabels: { ...question.scaleLabels, end: e.target.value } })}
                placeholder="e.g. Agree"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {question.type === "rating" && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Scale (max rating)</label>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => update({ maxRating: n })}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  question.maxRating === n ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {question.type === "file_upload" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Max file size (MB)</label>
            <div className="flex gap-2">
              {[2, 5, 10, 25].map((n) => (
                <button
                  key={n}
                  onClick={() => update({ maxFileSize: n })}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    question.maxFileSize === n ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {n} MB
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Accepted file types</label>
            <input
              value={(question.acceptedFileTypes ?? []).join(", ")}
              onChange={(e) => update({ acceptedFileTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder=".pdf, .doc, .docx, .jpg, .png"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated extensions</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => update({ required: !question.required })}
            className={`w-9 h-5 rounded-full transition-colors relative ${question.required ? "bg-primary" : "bg-border"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${question.required ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm font-medium">Required</span>
        </label>
      </div>
    </div>
  );
}

// ─── Welcome Image Uploader ──────────────────────────────────────────────────

const IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const IMAGE_ACCEPTED = [".jpg", ".jpeg", ".png", ".webp"];
const SUPABASE_URL_FB = import.meta.env.VITE_SUPABASE_URL;

function WelcomeImageUploader({
  currentUrl,
  formId,
  onUploaded,
}: {
  currentUrl: string;
  formId: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > IMAGE_MAX_SIZE) {
      setError("Image must be under 2 MB.");
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!IMAGE_ACCEPTED.includes(ext)) {
      setError("Only .jpg, .jpeg, .png and .webp files are accepted.");
      return;
    }

    setUploading(true);
    const path = `welcome/${formId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("form-uploads")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    const publicUrl = `${SUPABASE_URL_FB}/storage/v1/object/public/form-uploads/${path}`;
    onUploaded(publicUrl);
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {currentUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
          <img src={currentUrl} alt="Welcome" className="w-full h-40 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload size={13} />
            </button>
            <button
              onClick={() => onUploaded("")}
              className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/3 cursor-pointer transition-all"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          ) : (
            <Upload size={20} className="text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            {uploading ? "Uploading..." : "Drop an image or click to upload"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP · Max 2 MB</p>
        </div>
      )}
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

// activeIdx: -1 = welcome, 0..N-1 = questions, N = thank you
function LivePreview({ form, activeIdx, device }: { form: Form; activeIdx: number; device: "mobile" | "desktop" }) {
  const hasWelcome = !!form.settings.welcomeScreen?.enabled;
  const isWelcome = activeIdx === -1 && hasWelcome;
  const isThankYou = activeIdx === form.questions.length;
  const q = !isWelcome && !isThankYou ? form.questions[activeIdx] : null;

  const isDesktop = device === "desktop";

  const outerClasses = isDesktop
    ? "w-full max-w-[960px]"
    : "py-4";

  const frameClasses = isDesktop
    ? "w-full aspect-video rounded-xl border border-border overflow-hidden shadow-2xl"
    : "w-[320px] h-[580px] rounded-[2.5rem] border-[6px] border-foreground/80 overflow-hidden shadow-2xl";

  const ws = form.settings.welcomeScreen;

  // Convert YouTube watch URLs to embed
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  return (
    <div className={`flex items-center justify-center ${outerClasses}`}>
      <div className={frameClasses}>
        {/* Browser chrome for desktop */}
        {isDesktop && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground/95 border-b border-white/10 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            </div>
            <div className="flex-1 mx-8">
              <div className="bg-white/10 rounded-md px-3 py-1 text-white/40 text-[10px] font-mono text-center truncate">
                share.formqo.com/f/{form.id.slice(0, 8)}…
              </div>
            </div>
          </div>
        )}

        <div className={`w-full ${isDesktop ? "h-[calc(100%-36px)]" : "h-full"} overflow-y-auto flex flex-col`} style={{ background: "hsl(var(--foreground))", fontFamily: "'Inter', sans-serif" }}>
          {/* Progress bar (only on questions) */}
          {!isWelcome && !isThankYou && (
            <div className="w-full h-0.5 bg-white/10 shrink-0">
              <div className="h-full bg-white transition-all" style={{ width: `${((activeIdx + 1) / Math.max(form.questions.length, 1)) * 100}%` }} />
            </div>
          )}

          <div className={`flex-1 flex flex-col justify-center ${isDesktop ? "px-16 py-12 max-w-2xl mx-auto w-full" : "p-6"}`}>
            {/* ── Welcome Screen ── */}
            {isWelcome && (
              <>
                <p className={`text-white/40 uppercase tracking-widest mb-4 font-body ${isDesktop ? "text-xs" : "text-[10px]"}`}>
                  {form.questions.length} questions · ~2 min
                </p>
                <h3 className={`font-display font-bold text-white leading-tight mb-3 ${isDesktop ? "text-2xl" : "text-lg"}`}>
                  {ws?.title || form.title || <span className="opacity-30 italic font-normal">Welcome title</span>}
                </h3>
                {(ws?.description || form.description) && (
                  <p className={`text-white/50 mb-5 leading-relaxed ${isDesktop ? "text-sm" : "text-xs"}`}>
                    {ws?.description || form.description}
                  </p>
                )}
                {ws?.imageUrl && (
                  <div className={`mb-4 rounded-lg overflow-hidden ${isDesktop ? "max-w-xs" : "max-w-[200px]"}`}>
                    <img src={ws.imageUrl} alt="Welcome" className="w-full h-auto object-cover rounded-lg" />
                  </div>
                )}
                {ws?.videoUrl && (
                  <div className={`mb-4 rounded-lg overflow-hidden aspect-video ${isDesktop ? "max-w-xs" : "max-w-[200px]"}`}>
                    <iframe src={getEmbedUrl(ws.videoUrl)} title="Welcome video" className="w-full h-full rounded-lg" allowFullScreen />
                  </div>
                )}
                <button className={`self-start flex items-center gap-2 bg-white text-foreground rounded-lg font-semibold ${isDesktop ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"}`}>
                  {ws?.buttonText || "Start"} <ArrowRight size={isDesktop ? 12 : 10} />
                </button>
              </>
            )}

            {/* ── Thank You Screen ── */}
            {isThankYou && (
              <>
                <div className={`rounded-full bg-white/15 flex items-center justify-center mb-6 ${isDesktop ? "w-12 h-12" : "w-10 h-10"}`}>
                  <Check size={isDesktop ? 20 : 16} className="text-white" />
                </div>
                <h3 className={`font-display font-bold text-white leading-tight mb-3 ${isDesktop ? "text-2xl" : "text-lg"}`}>
                  {form.settings.thankYouTitle || "Thank you!"}
                </h3>
                <p className={`text-white/50 ${isDesktop ? "text-sm" : "text-xs"}`}>
                  {form.settings.thankYouMessage || "Your response has been recorded."}
                </p>
              </>
            )}

            {/* ── Question Screen ── */}
            {q ? (
              <>
                <p className={`text-white/40 mb-4 font-body ${isDesktop ? "text-sm" : "text-xs"}`}>
                  {activeIdx + 1} → {QUESTION_TYPES.find(t => t.type === q.type)?.label}
                </p>
                <h3 className={`font-display font-bold text-white leading-tight mb-3 ${isDesktop ? "text-2xl" : "text-lg"}`}>
                  {q.required && <span className="text-primary">* </span>}
                  {q.title || <span className="opacity-30 italic font-normal">Untitled question</span>}
                </h3>
                {q.description && <p className={`text-white/50 mb-5 ${isDesktop ? "text-sm" : "text-xs"}`}>{q.description}</p>}

                {(q.type === "short_text" || q.type === "email" || q.type === "number") && (
                  <div className={`border-b border-white/25 pb-2 text-white/30 ${isDesktop ? "text-base" : "text-sm"}`}>
                    {q.placeholder || "Type your answer here..."}
                  </div>
                )}
                {q.type === "long_text" && (
                  <div className={`border border-white/20 rounded-lg p-3 text-white/30 ${isDesktop ? "text-sm h-24" : "text-xs h-16"}`}>
                    {q.placeholder || "Type your answer here..."}
                  </div>
                )}
                {q.type === "rating" && (
                  <div className="flex gap-2 mt-2">
                    {Array.from({ length: q.maxRating ?? 5 }, (_, i) => (
                      <div key={i} className={`rounded-lg border border-white/25 flex items-center justify-center text-white/50 font-bold ${isDesktop ? "w-11 h-11 text-sm" : "w-8 h-8 text-xs"}`}>{i + 1}</div>
                    ))}
                  </div>
                )}
                {q.type === "multiple_choice" && q.options && (
                  <div className="space-y-2 mt-2">
                    {q.options.slice(0, 4).map((opt, i) => (
                      <div key={opt.id} className={`flex items-center gap-3 border border-white/20 rounded-lg ${isDesktop ? "px-4 py-3" : "px-3 py-2"}`}>
                        <span className={`text-white/30 ${isDesktop ? "text-sm w-5" : "text-xs w-4"}`}>{String.fromCharCode(65 + i)}</span>
                        <span className={`text-white/60 ${isDesktop ? "text-sm" : "text-xs"}`}>{opt.label}</span>
                      </div>
                    ))}
                    {q.options.length > 4 && <p className="text-white/25 text-xs pl-1">+{q.options.length - 4} more</p>}
                  </div>
                )}
                {q.type === "yes_no" && (
                  <div className="flex gap-3 mt-2">
                    {["Yes", "No"].map((opt) => (
                      <div key={opt} className={`flex items-center gap-2 border border-white/20 rounded-lg ${isDesktop ? "px-5 py-3" : "px-4 py-2"}`}>
                        <span className={`text-white/30 ${isDesktop ? "text-sm" : "text-xs"}`}>{opt === "Yes" ? "Y" : "N"}</span>
                        <span className={`text-white/60 ${isDesktop ? "text-base" : "text-sm"}`}>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button className={`mt-6 self-start flex items-center gap-2 bg-white text-foreground rounded-lg font-semibold ${isDesktop ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"}`}>
                  OK <ArrowLeft size={isDesktop ? 12 : 10} className="rotate-180" />
                </button>
              </>
            ) : !isWelcome && !isThankYou ? (
              <div className="text-center text-white/30"><p className={isDesktop ? "text-base" : "text-sm"}>No questions yet</p></div>
            ) : null}
          </div>

          <div className="flex justify-center pb-3">
            <p className="text-white/20 text-[10px]">Powered by <span className="font-bold">Formqo</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question List Item ──────────────────────────────────────────────────────

function QuestionListItem({
  question, index, isActive, onSelect, onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown,
}: {
  question: Question;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const Icon = TYPE_ICONS[question.type] ?? AlignLeft;

  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border ${
        isActive ? "bg-primary/5 border-primary/30" : "border-transparent hover:bg-muted/60"
      }`}
    >
      <GripVertical size={14} className="text-muted-foreground/40 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Icon size={12} className={isActive ? "text-primary" : "text-muted-foreground"} />
          <span className={`text-xs font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{index + 1}</span>
          {question.required && <span className="text-primary text-xs">*</span>}
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {question.title || <span className="text-muted-foreground italic font-normal">Untitled</span>}
        </p>
      </div>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={!canMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
          <ChevronUp size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={!canMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
          <ChevronDown size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Question Sidebar Content ─────────────────────────────────────────────────

function QuestionSidebarContent({
  form,
  activeIdx,
  setActiveIdx,
  showTypeMenu,
  setShowTypeMenu,
  moveQuestion,
  deleteQuestion,
  addQuestion,
}: {
  form: Form;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  showTypeMenu: boolean;
  setShowTypeMenu: (v: boolean) => void;
  moveQuestion: (from: number, to: number) => void;
  deleteQuestion: (idx: number) => void;
  addQuestion: (type: QuestionType) => void;
}) {
  return (
    <>
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Questions</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {form.questions.length === 0 && (
          <div className="text-center py-10 px-4">
            <p className="text-muted-foreground text-sm mb-1">No questions yet</p>
            <p className="text-muted-foreground text-xs">Add your first question below</p>
          </div>
        )}
        {form.questions.map((q, idx) => (
          <QuestionListItem
            key={q.id}
            question={q}
            index={idx}
            isActive={idx === activeIdx}
            onSelect={() => setActiveIdx(idx)}
            onMoveUp={() => moveQuestion(idx, idx - 1)}
            onMoveDown={() => moveQuestion(idx, idx + 1)}
            onDelete={() => deleteQuestion(idx)}
            canMoveUp={idx > 0}
            canMoveDown={idx < form.questions.length - 1}
          />
        ))}
      </div>
      <div className="p-3 border-t border-border relative">
        <button
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/3 text-muted-foreground hover:text-primary text-sm font-medium transition-all"
        >
          <Plus size={15} /> Add question
        </button>
        {showTypeMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
            {QUESTION_TYPES.map((t) => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.type}
                  onClick={() => addQuestion(t.type)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <TIcon size={14} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Preview Panel Content ────────────────────────────────────────────────────

function PreviewPanelContent({
  form,
  activeIdx,
  previewDevice,
  setPreviewDevice,
  setActivePanel,
  activePanel,
}: {
  form: Form;
  activeIdx: number;
  previewDevice: "mobile" | "desktop";
  setPreviewDevice: (d: "mobile" | "desktop") => void;
  setActivePanel: (p: "editor" | "settings") => void;
  activePanel: "editor" | "settings";
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setPreviewDevice("mobile")}
            className={`p-1.5 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone size={13} />
          </button>
          <button
            onClick={() => setPreviewDevice("desktop")}
            className={`p-1.5 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex items-start justify-center">
        <LivePreview form={form} activeIdx={activeIdx} device={previewDevice} />
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-xs">
        <button
          onClick={() => setActivePanel("settings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
            activePanel === "settings" ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings size={12} /> Settings
        </button>
        <span className="ml-auto text-muted-foreground">{form.questions.length} Q</span>
      </div>
    </>
  );
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const emptyForm = (id: string): Form => ({
  id,
  title: "Untitled form",
  questions: [],
  settings: { primaryColor: "hsl(357 95% 22%)", showBranding: true },
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const FormBuilder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const formId = searchParams.get("id");

  const [form, setForm] = useState<Form>(emptyForm(formId ?? uid()));
  const [loading, setLoading] = useState(!!formId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [activePanel, setActivePanel] = useState<"editor" | "settings">("editor");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(false);

  // AI suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [lastFetchedTitle, setLastFetchedTitle] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load form from Supabase ────────────────────────────────────────────────
  useEffect(() => {
    if (!formId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error || !data) {
        toast.error("Form not found");
        navigate("/dashboard");
        return;
      }

      setForm({
        id: data.id,
        title: data.title,
        description: data.description ?? undefined,
        questions: Array.isArray(data.questions) ? (data.questions as unknown as import("@/types/form").Question[]) : [],
        settings: (data.settings as unknown as Form["settings"]) ?? { primaryColor: "hsl(357 95% 22%)", showBranding: true },
        status: data.status as Form["status"],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
      setLoading(false);
    };
    load();
  }, [formId, navigate]);

  // ── Save form to Supabase ──────────────────────────────────────────────────
  const saveForm = useCallback(async (f: Form) => {
    if (!user) return;
    setSaving(true);
    try {
      if (formId || (f.id && f.id.length === 36)) {
        // Update existing
        const { error } = await supabase
          .from("forms")
          .update({
            title: f.title,
            description: f.description ?? null,
            questions: f.questions as unknown as import("@/integrations/supabase/types").Json,
            settings: f.settings as unknown as import("@/integrations/supabase/types").Json,
            status: f.status,
          })
          .eq("id", f.id);
        if (error) throw error;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("forms")
          .insert({
            user_id: user.id,
            title: f.title,
            description: f.description ?? null,
            questions: f.questions as unknown as never,
            settings: f.settings as unknown as never,
            status: f.status,
          })
          .select("id")
          .single();
        if (error) throw error;
        // Update form state and URL with the real UUID from Supabase
        if (data) {
          setForm((prev) => ({ ...prev, id: data.id }));
          navigate(`/builder?id=${data.id}`, { replace: true });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [user, formId, navigate]);

  // ── Auto-save on form change (debounced) ───────────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (loading) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => saveForm(form), 1500);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // ── AI suggestions ─────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (title: string) => {
    if (title.trim().length < 5) return;
    if (title === lastFetchedTitle) return;
    setLastFetchedTitle(title);
    setAiLoading(true);
    setAiError(null);
    setAiDismissed(false);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/suggest-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        if (res.status === 429) setAiError("Rate limit reached. Try again in a moment.");
        else if (res.status === 402) setAiError("AI usage limit reached.");
        else setAiError("Could not load suggestions.");
        setAiLoading(false);
        return;
      }
      const data = await res.json();
      setAiSuggestions((data.suggestions ?? []).filter((s: AISuggestion) => s.title && s.type));
    } catch {
      setAiError("Could not load suggestions.");
    } finally {
      setAiLoading(false);
    }
  }, [lastFetchedTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, title: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 5) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 800);
    } else {
      setAiSuggestions([]);
      setAiLoading(false);
    }
  };

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const addSuggestedQuestion = useCallback((s: AISuggestion) => {
    const q: Question = {
      id: uid(), type: s.type, title: s.title, required: s.required ?? false,
      options: s.options ? s.options.map((label) => ({ id: uid(), label })) : (s.type === "multiple_choice" ? [{ id: uid(), label: "Option 1" }, { id: uid(), label: "Option 2" }] : undefined),
      maxRating: s.type === "rating" ? 5 : undefined,
    };
    setForm((f) => {
      const qs = [...f.questions, q];
      setActiveIdx(qs.length - 1);
      setAiSuggestions((prev) => prev.filter((p) => p.title !== s.title));
      return { ...f, questions: qs };
    });
    toast.success(`Added: "${s.title.slice(0, 40)}${s.title.length > 40 ? "…" : ""}"`);
  }, []);

  const addAllSuggestions = useCallback(() => {
    const newQs: Question[] = aiSuggestions.map((s) => ({
      id: uid(), type: s.type, title: s.title, required: s.required ?? false,
      options: s.options ? s.options.map((label) => ({ id: uid(), label })) : (s.type === "multiple_choice" ? [{ id: uid(), label: "Option 1" }, { id: uid(), label: "Option 2" }] : undefined),
      maxRating: s.type === "rating" ? 5 : undefined,
    }));
    setForm((f) => {
      const qs = [...f.questions, ...newQs];
      setActiveIdx(qs.length - 1);
      return { ...f, questions: qs };
    });
    setAiSuggestions([]);
    toast.success(`Added ${newQs.length} questions`);
  }, [aiSuggestions]);

  const updateQuestion = (idx: number, q: Question) => {
    setForm((f) => { const qs = [...f.questions]; qs[idx] = q; return { ...f, questions: qs }; });
  };

  const addQuestion = (type: QuestionType) => {
    const q = defaultQuestion(type);
    setForm((f) => {
      const qs = [...f.questions, q];
      setActiveIdx(qs.length - 1);
      return { ...f, questions: qs };
    });
    setShowTypeMenu(false);
  };

  const deleteQuestion = (idx: number) => {
    setForm((f) => {
      const qs = f.questions.filter((_, i) => i !== idx);
      setActiveIdx(Math.max(0, idx - 1));
      return { ...f, questions: qs };
    });
  };

  const moveQuestion = (from: number, to: number) => {
    setForm((f) => {
      const qs = [...f.questions];
      const [removed] = qs.splice(from, 1);
      qs.splice(to, 0, removed);
      setActiveIdx(to);
      return { ...f, questions: qs };
    });
  };

  const activeQuestion = form.questions[activeIdx];
  const showAiPanel = !aiDismissed && (aiLoading || aiSuggestions.length > 0 || aiError !== null);

  const sidebarSharedProps = {
    form, activeIdx, setActiveIdx, showTypeMenu, setShowTypeMenu,
    moveQuestion, deleteQuestion, addQuestion,
  };

  const previewSharedProps = {
    form, activeIdx, previewDevice, setPreviewDevice, setActivePanel, activePanel,
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {showShareModal && <ShareModal form={form} onClose={() => setShowShareModal(false)} />}

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* ── Top bar ── */}
        <header className="h-14 border-b border-border bg-card flex items-center px-3 md:px-4 gap-2 md:gap-4 shrink-0 z-40">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />

          {/* Mobile: sidebar sheet trigger */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0">
                  <Menu size={16} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="flex flex-col h-full">
                  <QuestionSidebarContent {...sidebarSharedProps} />
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Editable title */}
          <input
            ref={titleRef}
            value={form.title}
            onChange={handleTitleChange}
            className="font-display font-semibold text-sm bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted/30 px-2 py-1 rounded-lg transition-all flex-1 min-w-0 max-w-xs"
            placeholder="Untitled form"
          />

          {aiLoading && (
            <div className="flex items-center gap-1.5 text-xs text-primary shrink-0">
              <Sparkles size={12} className="animate-pulse" />
              <span className="hidden md:inline">Generating…</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex ${
              form.status === "active" ? "bg-green-50 text-green-700" :
              form.status === "closed" ? "bg-muted text-muted-foreground" :
              "bg-amber-50 text-amber-700"
            }`}>
              {form.status}
            </span>

            <button
              onClick={() => setShowPreviewOverlay(true)}
              className="btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hidden sm:flex"
            >
              <Eye size={13} /> Preview
            </button>

            {/* Mobile: preview sheet trigger */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg border border-border hover:border-primary hover:text-primary transition-colors">
                    <Layers size={13} />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0 flex flex-col">
                  <div className="flex flex-col h-full">
                    <PreviewPanelContent {...previewSharedProps} />
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <button
              onClick={() => saveForm(form)}
              disabled={saving}
              className={`flex items-center gap-1.5 text-xs py-2 px-3 md:px-4 rounded-lg font-semibold transition-all ${
                saved ? "bg-green-600 text-white" : "btn-primary"
              }`}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <><Check size={13} /> Saved</> : "Save"}
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 md:px-4 hidden sm:flex"
            >
              <Share2 size={13} /> Share
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left: Question list (desktop only) ── */}
          {!isMobile && (
            <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
              <QuestionSidebarContent {...sidebarSharedProps} />
            </aside>
          )}

          {/* ── Center: Question editor ── */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="border-b border-border px-4 md:px-6 flex gap-1 bg-card">
              {(["editor", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivePanel(tab)}
                  className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${
                    activePanel === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "editor" ? "Questions" : "Settings"}
                </button>
              ))}
            </div>

            {activePanel === "editor" && (
              <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">
                {showAiPanel && (
                  <AISuggestionPanel
                    suggestions={aiSuggestions}
                    loading={aiLoading}
                    error={aiError}
                    onAdd={addSuggestedQuestion}
                    onAddAll={addAllSuggestions}
                    onDismiss={() => setAiDismissed(true)}
                  />
                )}

                {activeQuestion ? (
                  <QuestionEditor
                    question={activeQuestion}
                    index={activeIdx}
                    onChange={(q) => updateQuestion(activeIdx, q)}
                  />
                ) : showAIChat ? (
                  <div className="h-[600px]">
                    <FormqoAIChat
                      onApplyForm={(result) => {
                        setForm((f) => ({
                          ...f,
                          title: result.title,
                          description: result.description,
                          questions: result.questions,
                        }));
                        setActiveIdx(0);
                        setShowAIChat(false);
                        toast.success(`Form created with ${result.questions.length} questions`);
                      }}
                    />
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto py-12 px-6">
                    {/* Editable form title */}
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Form title"
                      className="w-full text-4xl font-display font-bold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-none outline-none mb-8"
                    />

                    {/* Quick-start actions */}
                    <div className="space-y-2 mb-10">
                      <button
                        onClick={() => addQuestion("short_text")}
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors py-1.5 group"
                      >
                        <FileText size={16} className="text-muted-foreground/60 group-hover:text-foreground/70" />
                        <span className="text-sm">Start from scratch</span>
                      </button>
                      <Link
                        to="/templates"
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors py-1.5 group"
                      >
                        <Layers size={16} className="text-muted-foreground/60 group-hover:text-foreground/70" />
                        <span className="text-sm">Use a template</span>
                      </Link>
                      <button
                        onClick={() => setShowAIChat(true)}
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors py-1.5 group"
                      >
                        <Sparkles size={16} className="text-primary/60 group-hover:text-primary" />
                        <span className="text-sm">Build with FormqoAI</span>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border mb-10" />

                    {/* Question type blocks — categorized */}
                    <div className="grid grid-cols-3 gap-x-10 gap-y-8">
                      {(["Contact info", "Choice", "Rating & ranking", "Text & Video", "Other"] as const).map((cat) => {
                        const items = QUESTION_TYPES.filter((t) => t.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat}>
                            <h4 className="font-display font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">{cat}</h4>
                            {items.map((t) => {
                              const TIcon = t.icon;
                              return (
                                <button
                                  key={t.type}
                                  onClick={() => addQuestion(t.type)}
                                  className="flex items-center gap-3 w-full py-2 text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                  <TIcon size={15} className="text-muted-foreground/60 group-hover:text-foreground/70" />
                                  <span className="text-sm">{t.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePanel === "settings" && (
              <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* Welcome / Opening screen */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-base">Welcome screen</h2>
                    <div
                      onClick={() => setForm((f) => ({
                        ...f,
                        settings: {
                          ...f.settings,
                          welcomeScreen: {
                            ...f.settings.welcomeScreen,
                            enabled: !f.settings.welcomeScreen?.enabled,
                          },
                        },
                      }))}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${form.settings.welcomeScreen?.enabled ? "bg-primary" : "bg-border"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.settings.welcomeScreen?.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                  {form.settings.welcomeScreen?.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Title</label>
                        <input
                          value={form.settings.welcomeScreen?.title ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeScreen: { ...f.settings.welcomeScreen, enabled: true, title: e.target.value } } }))}
                          placeholder="Welcome! We'd love your feedback"
                          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground font-display font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                        <textarea
                          rows={3}
                          value={form.settings.welcomeScreen?.description ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeScreen: { ...f.settings.welcomeScreen, enabled: true, description: e.target.value } } }))}
                          placeholder="Introduce your form and let people know what to expect..."
                          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Image <span className="font-normal normal-case">(optional, max 2 MB)</span></label>
                        <WelcomeImageUploader
                          currentUrl={form.settings.welcomeScreen?.imageUrl ?? ""}
                          formId={form.id}
                          onUploaded={(url) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeScreen: { ...f.settings.welcomeScreen, enabled: true, imageUrl: url } } }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Video embed URL <span className="font-normal normal-case">(YouTube / Vimeo)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <PlayCircle size={16} className="text-muted-foreground shrink-0" />
                          <input
                            value={form.settings.welcomeScreen?.videoUrl ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeScreen: { ...f.settings.welcomeScreen, enabled: true, videoUrl: e.target.value } } }))}
                            placeholder="https://youtube.com/embed/..."
                            className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Button text</label>
                        <input
                          value={form.settings.welcomeScreen?.buttonText ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeScreen: { ...f.settings.welcomeScreen, enabled: true, buttonText: e.target.value } } }))}
                          placeholder="Start"
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="border-t border-border pt-8">
                  <h2 className="font-display font-semibold text-base mb-4">Thank-you screen</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Title</label>
                      <input
                        value={form.settings.thankYouTitle ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, thankYouTitle: e.target.value } }))}
                        placeholder="Thank you for your response!"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground font-display font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Message</label>
                      <textarea
                        rows={3}
                        value={form.settings.thankYouMessage ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, thankYouMessage: e.target.value } }))}
                        placeholder="Your response has been recorded."
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      />
                    </div>
                  </div>
                </section>

                <section className="border-t border-border pt-8">
                  <h2 className="font-display font-semibold text-base mb-1">Formqo branding</h2>
                  <p className="text-xs text-muted-foreground mb-4">Show "Powered by Formqo" at the bottom of your form.</p>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">Show Formqo badge</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Remove branding on Pro plan</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Pro feature</span>
                      <div
                        onClick={() => setForm((f) => ({ ...f, settings: { ...f.settings, showBranding: !f.settings.showBranding } }))}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${form.settings.showBranding ? "bg-primary" : "bg-border"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.settings.showBranding ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border-t border-border pt-8">
                  <h2 className="font-display font-semibold text-base mb-1">Form status</h2>
                  <p className="text-xs text-muted-foreground mb-4">Control whether this form is accepting new responses.</p>
                  <div className="flex gap-2">
                    {(["draft", "active", "closed"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm((f) => ({ ...f, status: s }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-semibold capitalize transition-colors ${
                          form.status === s ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="border-t border-border pt-6">
                  <button onClick={() => saveForm(form)} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save settings
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* ── Full-screen preview overlay ── */}
          {showPreviewOverlay && (
            <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-3">
                  <p className="font-display font-semibold text-sm text-foreground">Preview</p>
                  <span className="text-xs text-muted-foreground">{form.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Smartphone size={13} />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Monitor size={13} />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowPreviewOverlay(false)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
                <LivePreview form={form} activeIdx={activeIdx} device={previewDevice} />
              </div>
              <div className="flex justify-center items-center gap-2 pb-4">
                {/* Welcome dot */}
                {form.settings.welcomeScreen?.enabled && (
                  <button
                    onClick={() => setActiveIdx(-1)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${activeIdx === -1 ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground hover:bg-muted-foreground/30"}`}
                  >
                    Welcome
                  </button>
                )}
                {/* Question dots */}
                {form.questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === activeIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/30"}`}
                  />
                ))}
                {/* Thank you dot */}
                <button
                  onClick={() => setActiveIdx(form.questions.length)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${activeIdx === form.questions.length ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground hover:bg-muted-foreground/30"}`}
                >
                  End
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FormBuilder;
