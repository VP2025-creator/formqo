import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

import {
  FORM_TEMPLATES,
  TEMPLATE_CATEGORIES,
  FormTemplate,
  TemplateCategory,
} from "@/data/templates";
import type { Json } from "@/integrations/supabase/types";
import { Question } from "@/types/form";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  X, Clock, ArrowRight, ChevronRight, Loader2, Eye,
} from "lucide-react";

// ── Question type labels ───────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  multiple_choice: "Multiple choice",
  rating: "Rating",
  email: "Email",
  yes_no: "Yes / No",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
};

// ── Category accent colours (using design tokens) ──────────────────────────
const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  Contact:  { bg: "bg-primary/8",  text: "text-primary" },
  Feedback: { bg: "bg-primary/8",  text: "text-primary" },
  Research: { bg: "bg-primary/8",  text: "text-primary" },
  HR:       { bg: "bg-primary/8",  text: "text-primary" },
  Events:   { bg: "bg-primary/8",  text: "text-primary" },
  "Lead Gen": { bg: "bg-primary/8", text: "text-primary" },
};

// ── Mini question preview ──────────────────────────────────────────────────
function QuestionPreviewItem({ q, idx }: { q: Question; idx: number }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{q.title}</p>
        {q.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{q.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {TYPE_LABELS[q.type] ?? q.type}
          </span>
          {q.required && (
            <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              Required
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────────
function PreviewModal({
  template,
  onClose,
  onUse,
  cloning,
}: {
  template: FormTemplate;
  onClose: () => void;
  onUse: (t: FormTemplate) => void;
  cloning: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">{template.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                  {template.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={11} /> {template.estimatedTime}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {template.questions.length} questions
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pt-3 pb-1">
            Questions
          </p>
          {template.questions.map((q, i) => (
            <QuestionPreviewItem key={q.id} q={q} idx={i} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="btn-outline text-sm px-4 py-2"
          >
            Close
          </button>
          <button
            onClick={() => onUse(template)}
            disabled={cloning}
            className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5 disabled:opacity-70"
          >
            {cloning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            {cloning ? "Creating form…" : "Use this template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onPreview,
  onUse,
  cloning,
}: {
  template: FormTemplate;
  onPreview: (t: FormTemplate) => void;
  onUse: (t: FormTemplate) => void;
  cloning: boolean;
}) {
  const cat = CATEGORY_STYLES[template.category] ?? CATEGORY_STYLES.Contact;
  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-primary/40 transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden">
      {/* Card top */}
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{template.icon}</span>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat.bg} ${cat.text}`}>
            {template.category}
          </span>
        </div>
        <h3 className="font-display font-semibold text-base text-foreground mb-2 leading-tight">
          {template.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {template.description}
        </p>
        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {template.estimatedTime}
          </span>
          <span>·</span>
          <span>{template.questions.length} questions</span>
        </div>
      </div>

      {/* Card actions */}
      <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center gap-2">
        <button
          onClick={() => onPreview(template)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
        >
          <Eye size={13} /> Preview
        </button>
        <button
          onClick={() => onUse(template)}
          disabled={cloning}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold btn-primary px-4 py-2 disabled:opacity-60"
        >
          {cloning ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={13} />}
          Use template
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const filtered = FORM_TEMPLATES.filter((t) => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q));
    return matchCat && matchSearch;
  });

  const handleUse = async (template: FormTemplate) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create a free account to use templates.",
      });
      navigate("/signup");
      return;
    }

    setCloningId(template.id);

    const { data, error } = await supabase
      .from("forms")
      .insert({
        user_id: user.id,
        title: template.title,
        description: template.description,
        questions: template.questions as unknown as Json,
        settings: template.settings as unknown as Json,
        status: "draft",
      })
      .select("id")
      .single();

    setCloningId(null);

    if (error) {
      toast({ title: "Failed to create form", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Form created!", description: `"${template.title}" is ready to edit.` });
    setPreviewTemplate(null);
    navigate(`/builder?id=${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-14 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <p className="section-tag mb-3">Templates</p>
          <h1 className="font-display font-bold text-5xl md:text-6xl text-foreground leading-[1.05] tracking-tight mb-5">
            Start from a<br />
            <span className="text-primary">proven template.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            10 professionally crafted form templates across every category — free to clone and customise in seconds.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full px-5 py-3.5 pr-12 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm">⌘K</span>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            {(["All", ...TEMPLATE_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as TemplateCategory | "All")}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-14 px-4">
        <div className="container mx-auto max-w-6xl">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-4xl mb-4">🔍</p>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">No templates found</h3>
              <p className="text-sm text-muted-foreground">Try a different category or search term.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-6">
                {filtered.length} template{filtered.length !== 1 ? "s" : ""}
                {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onPreview={setPreviewTemplate}
                    onUse={handleUse}
                    cloning={cloningId === t.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA strip */}
      {!user && (
        <section className="py-16 px-4 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
              Ready to build your first form?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Free forever. No credit card required. Clone any template in one click.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary font-display font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:bg-primary-foreground/90 hover:scale-[1.02]"
            >
              Get started free <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUse}
          cloning={cloningId === previewTemplate.id}
        />
      )}
    </div>
  );
};

export default Templates;
