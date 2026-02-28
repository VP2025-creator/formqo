import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, BarChart3, Eye, MoreHorizontal, Zap, Users,
  TrendingUp, FileText, Clock, ChevronRight, Pencil, Puzzle,
  ArrowRight, Loader2, Trash2, Link2, Copy, Search, X, PieChart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Form {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  questions: unknown;
  settings: unknown;
  description: string | null;
  responseCount?: number;
}

interface Profile {
  full_name: string | null;
  plan: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "closed">("all");

  const loadData = async () => {
    if (!user) return;
    const [profileRes, formsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, plan").eq("id", user.id).single(),
      supabase.from("forms").select("id, title, status, updated_at, questions, settings, description").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (formsRes.data) {
      const formsData = formsRes.data;
      if (formsData.length > 0) {
        const formIds = formsData.map((f) => f.id);
        const { data: responsesData } = await supabase
          .from("form_responses")
          .select("form_id")
          .in("form_id", formIds);
        const countMap: Record<string, number> = {};
        (responsesData ?? []).forEach((r) => {
          countMap[r.form_id] = (countMap[r.form_id] ?? 0) + 1;
        });
        const total = Object.values(countMap).reduce((a, b) => a + b, 0);
        setTotalResponses(total);
        setForms(formsData.map((f) => ({ ...f, responseCount: countMap[f.id] ?? 0 })));
      } else {
        setForms([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggleStatus = async (formId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    const { error } = await supabase.from("forms").update({ status: newStatus }).eq("id", formId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setForms((prev) => prev.map((f) => f.id === formId ? { ...f, status: newStatus } : f));
      toast.success(newStatus === "active" ? "Form is now live ✓" : "Form deactivated");
    }
  };

  const handleCopyLink = (formId: string) => {
    const url = `${window.location.origin}/f/${formId}?preview=1`;
    navigator.clipboard.writeText(url);
    toast.success("Preview link copied!");
  };

  const handleDuplicate = async (form: Form) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("forms")
      .insert({
        user_id: user.id,
        title: `${form.title} (copy)`,
        description: form.description,
        questions: form.questions as never,
        settings: form.settings as never,
        status: "draft",
      })
      .select("id, title, status, updated_at, questions, settings, description")
      .single();
    if (error) {
      toast.error("Failed to duplicate form");
    } else if (data) {
      setForms((prev) => [{ ...data, responseCount: 0 }, ...prev]);
      toast.success("Form duplicated!");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    const { error } = await supabase.from("forms").delete().eq("id", formId);
    if (error) {
      toast.error("Failed to delete form");
    } else {
      setForms((prev) => prev.filter((f) => f.id !== formId));
      toast.success("Form deleted");
    }
  };

  const isAdmin = profile?.plan === "admin";
  const isFree = !isAdmin && (profile?.plan === "free" || !profile?.plan);

  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [forms, search, statusFilter]);

  const formCount = forms.length;
  const showUpgradeNudge = isFree && (formCount >= 2 || totalResponses >= 80);
  const nudgeReason =
    totalResponses >= 80
      ? `You've used ${totalResponses} of 100 monthly responses`
      : `You're using ${formCount} of 3 available forms`;

  const activeForms = forms.filter((f) => f.status === "active").length;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole={isAdmin ? "admin" : "user"} />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="font-display font-bold text-xl md:text-2xl text-foreground">
              {loading ? "My Forms" : `Hey, ${firstName} 👋`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back — here's what's happening</p>
          </div>
          <Link to="/builder" className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto">
            <Plus size={16} />
            New form
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              {[
                { label: "Total responses", value: String(totalResponses), icon: BarChart3, sub: isFree ? `of 100 free` : "this month" },
                { label: "Active forms", value: String(activeForms), icon: FileText, sub: `of ${formCount} total` },
                { label: "Total forms", value: String(formCount), icon: TrendingUp, sub: isFree ? "of 3 (free plan)" : "unlimited" },
                { label: "Plan", value: isAdmin ? "Admin" : (profile?.plan ?? "Free"), icon: Users, sub: isAdmin ? "Unlimited access" : "Upgrade for more" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border border-border p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-xs text-muted-foreground leading-tight">{stat.label}</span>
                    <stat.icon size={15} className="text-muted-foreground shrink-0" />
                  </div>
                  <p className="font-display font-bold text-xl md:text-2xl text-foreground capitalize">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Smart upgrade nudge */}
            {showUpgradeNudge && (
              <div className="rounded-2xl border border-primary bg-primary/5 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-in">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-foreground mb-0.5">You're close to your limit</h3>
                    <p className="text-xs text-muted-foreground">
                      {nudgeReason}. Upgrade to Pro for unlimited forms, 10,000 responses/mo, and AI features.
                    </p>
                  </div>
                </div>
                <Link to="/pricing" className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap self-start sm:self-auto">
                  Upgrade to Pro <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {/* Forms list */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border">
                <h2 className="font-display font-semibold text-sm shrink-0">Your forms</h2>
                <div className="flex items-center gap-2 flex-1 sm:justify-end">
                  {/* Search */}
                  <div className="relative flex-1 sm:max-w-[200px]">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search forms…"
                      className="pl-7 pr-7 h-8 text-xs"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  {/* Status filter */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(["all", "active", "draft", "closed"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          statusFilter === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {(search || statusFilter !== "all") && forms.length > 0 && (
                  <p className="text-xs text-muted-foreground px-4 md:px-6 pb-2">
                    Showing {filteredForms.length} of {formCount} form{formCount !== 1 ? "s" : ""}
                    {isFree ? ` · free plan (max 3)` : ""}
                  </p>
                )}
                {!search && statusFilter === "all" && (
                  <p className="text-xs text-muted-foreground px-4 md:px-6 pb-2">
                    {formCount} form{formCount !== 1 ? "s" : ""} {isFree ? `· free plan (max 3)` : ""}
                  </p>
                )}
              </div>
              {forms.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText size={32} className="text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No forms yet. Create your first one!</p>
                  <Link to="/builder" className="btn-primary inline-flex items-center gap-2 text-sm">
                    <Plus size={14} /> Create form
                  </Link>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Search size={28} className="text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No forms match your search.</p>
                  <button
                    onClick={() => { setSearch(""); setStatusFilter("all"); }}
                    className="text-xs text-primary mt-2 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredForms.map((form) => (
                    <div key={form.id} className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium text-sm text-foreground truncate max-w-[140px] sm:max-w-none">{form.title}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              form.status === "active"
                                ? "bg-green-50 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {form.status}
                          </span>
                          {/* Response count badge */}
                          {(form.responseCount ?? 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-primary/10 text-primary">
                              {form.responseCount} {form.responseCount === 1 ? "response" : "responses"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {formatDate(form.updated_at)}
                          </span>
                          <span>
                            {Array.isArray(form.questions) ? (form.questions as unknown[]).length : 0} questions
                          </span>
                        </div>
                      </div>

                      {/* Status toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Switch
                          checked={form.status === "active"}
                          onCheckedChange={() => handleToggleStatus(form.id, form.status)}
                          aria-label="Toggle form status"
                        />
                      </div>

                      {/* Desktop action buttons */}
                      <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/builder?id=${form.id}`}
                          className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Pencil size={12} /> Edit
                        </Link>
                        <Link
                          to={`/f/${form.id}?preview=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} /> Preview
                        </Link>
                        <Link
                          to={`/forms/${form.id}/responses`}
                          className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <BarChart3 size={12} /> Results
                        </Link>
                      </div>

                      {/* Action menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors md:opacity-0 md:group-hover:opacity-100">
                            <MoreHorizontal size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link to={`/builder?id=${form.id}`} className="flex items-center gap-2">
                              <Pencil size={13} /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/f/${form.id}?preview=1`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <Eye size={13} /> Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleCopyLink(form.id)}
                          >
                            <Link2 size={13} /> Copy link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/forms/${form.id}/responses`} className="flex items-center gap-2">
                              <BarChart3 size={13} /> Results
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/forms/${form.id}/analytics`} className="flex items-center gap-2">
                              <PieChart size={13} /> Analytics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleDuplicate(form)}
                          >
                            <Copy size={13} /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive flex items-center gap-2"
                            onClick={() => handleDeleteForm(form.id)}
                          >
                            <Trash2 size={13} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generic upgrade banner */}
            {!showUpgradeNudge && isFree && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-foreground mb-1">Upgrade to Pro</h3>
                    <p className="text-xs text-muted-foreground">
                      Unlock unlimited forms, AI question generation, remove Formqo branding, and more.
                    </p>
                  </div>
                </div>
                <Link to="/pricing" className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap self-start sm:self-auto">
                  Upgrade now <ChevronRight size={14} />
                </Link>
              </div>
            )}

            {/* Integrations quick link */}
            <Link
              to="/dashboard/integrations"
              className="flex items-center justify-between bg-card rounded-2xl border border-border px-4 md:px-6 py-4 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Puzzle size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">Integrations</p>
                  <p className="text-xs text-muted-foreground">Connect Slack, Zapier, email notifications</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
