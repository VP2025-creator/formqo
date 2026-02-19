import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Users, BarChart3, FileText, TrendingUp, Search, MoreHorizontal,
  Shield, Download, RefreshCw, Crown, ToggleLeft, ToggleRight,
  Save, X, Globe, Hash, ChevronRight, ChevronDown, ExternalLink,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string;
  created_at: string;
}

interface FormRow {
  id: string;
  title: string;
  status: string;
  user_id: string;
  max_responses: number | null;
  allowed_domains: string[] | null;
  captcha_enabled: boolean;
  created_at: string;
  _responseCount?: number;
  _ownerEmail?: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalForms: number;
  totalResponses: number;
  activeForms: number;
}

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary/10 text-primary",
  business: "bg-foreground text-background",
  admin: "bg-primary/10 text-primary",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  draft: "bg-muted text-muted-foreground",
  closed: "bg-destructive/10 text-destructive",
};

// ─── FormSettingsPanel ────────────────────────────────────────────────────────

function FormSettingsPanel({
  form,
  onClose,
  onSaved,
}: {
  form: FormRow;
  onClose: () => void;
  onSaved: (updated: Partial<FormRow>) => void;
}) {
  const [maxResponses, setMaxResponses] = useState(
    form.max_responses !== null ? String(form.max_responses) : ""
  );
  const [domainsRaw, setDomainsRaw] = useState(
    (form.allowed_domains ?? []).join(", ")
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);

    const maxNum = maxResponses.trim() === "" ? null : parseInt(maxResponses, 10);
    if (maxResponses.trim() !== "" && (isNaN(maxNum!) || maxNum! < 1)) {
      toast.error("Max responses must be a positive number or empty (unlimited)");
      setSaving(false);
      return;
    }

    // Parse domains: comma or newline separated, trim whitespace, remove empty
    const domains = domainsRaw
      .split(/[\n,]/)
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter((d) => d.length > 0 && d.includes("."));

    const { error } = await supabase
      .from("forms")
      .update({
        max_responses: maxNum,
        allowed_domains: domains.length > 0 ? domains : null,
      })
      .eq("id", form.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Form settings saved");
      onSaved({ max_responses: maxNum, allowed_domains: domains.length > 0 ? domains : null });
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="border border-border rounded-xl bg-muted/30 p-5 mt-2 space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-display font-semibold text-sm">Form security settings</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Max responses */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1.5">
          <Hash size={12} className="text-primary" />
          Max responses cap
        </label>
        <input
          type="number"
          min="1"
          placeholder="Unlimited (leave empty)"
          value={maxResponses}
          onChange={(e) => setMaxResponses(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave empty for unlimited. Once reached, the form stops accepting submissions.
        </p>
      </div>

      {/* Allowed domains */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1.5">
          <Globe size={12} className="text-primary" />
          Allowed domains (allowlist)
        </label>
        <textarea
          rows={3}
          placeholder={"example.com\napp.company.com\nshare.formqo.com"}
          value={domainsRaw}
          onChange={(e) => setDomainsRaw(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          One domain per line (or comma-separated). Leave empty to allow all domains.
          The <code className="text-primary">share.formqo.com</code> domain is always implicitly allowed.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save settings
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [formSearch, setFormSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "forms" | "analytics">("users");
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalForms: 0, totalResponses: 0, activeForms: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, formsRes, responsesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, plan, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("forms")
          .select("id, title, status, user_id, max_responses, allowed_domains, captcha_enabled, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("form_responses").select("*", { count: "exact", head: true }),
      ]);

      const profiles = profilesRes.data ?? [];
      const rawForms = (formsRes.data ?? []) as FormRow[];
      const activeForms = rawForms.filter((f) => f.status === "active").length;

      // Attach owner emails
      const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.email]));
      const enrichedForms = rawForms.map((f) => ({
        ...f,
        _ownerEmail: profileMap[f.user_id] ?? null,
      }));

      setUsers(profiles);
      setForms(enrichedForms);
      setStats({
        totalUsers: profiles.length,
        totalForms: rawForms.length,
        totalResponses: responsesRes.count ?? 0,
        activeForms,
      });
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleBranding = async (userId: string, currentPlan: string) => {
    setToggling(userId);
    const newPlan = currentPlan === "pro" ? "free" : "pro";
    const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("id", userId);
    if (error) {
      toast.error("Failed to update plan");
    } else {
      toast.success(`Plan set to ${newPlan}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u)));
    }
    setToggling(null);
  };

  const handleFormSettingsSaved = (formId: string, updated: Partial<FormRow>) => {
    setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, ...updated } : f)));
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const filteredForms = forms.filter(
    (f) =>
      f.title.toLowerCase().includes(formSearch.toLowerCase()) ||
      (f._ownerEmail?.toLowerCase() ?? "").includes(formSearch.toLowerCase())
  );

  const statCards = [
    { label: "Total users", value: stats.totalUsers.toLocaleString(), icon: Users, sub: "all accounts" },
    { label: "Total forms", value: stats.totalForms.toLocaleString(), icon: FileText, sub: `${stats.activeForms} active` },
    { label: "Total responses", value: stats.totalResponses.toLocaleString(), icon: BarChart3, sub: "all time" },
    { label: "Active forms", value: stats.activeForms.toLocaleString(), icon: TrendingUp, sub: "currently live" },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield size={40} className="text-destructive mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Access denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole="admin" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-primary" />
              <span className="text-xs font-semibold text-primary tracking-widest uppercase">Admin</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Formqo platform management · {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon size={15} className="text-muted-foreground" />
              </div>
              <p className="font-display font-bold text-2xl text-foreground">
                {loading ? <span className="inline-block w-12 h-6 bg-muted rounded animate-pulse" /> : stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Admin crown banner */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 mb-6">
          <Crown size={18} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">You have unlimited admin access</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All limits removed · Branding toggleable per-user · Per-form security controls
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
          {(["users", "forms", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <h2 className="font-display font-semibold text-sm">
                All users ({filteredUsers.length.toLocaleString()})
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["User", "Plan", "Branding off", "Joined", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground text-sm py-12">No users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isPro = ["pro", "admin", "business"].includes(u.plan);
                      const isCurrentUser = u.id === user.id;
                      return (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-semibold text-sm shrink-0">
                                {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                  {u.full_name ?? "—"}
                                  {isCurrentUser && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">You</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${planColors[u.plan] ?? planColors.free}`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => !isCurrentUser && toggleBranding(u.id, u.plan)}
                              disabled={toggling === u.id || isCurrentUser}
                              className="flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:text-primary"
                              title={isCurrentUser ? "Admin always has branding off" : isPro ? "Remove Pro (branding on)" : "Enable Pro (branding off)"}
                            >
                              {toggling === u.id ? (
                                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                              ) : isPro ? (
                                <ToggleRight size={20} className="text-primary" />
                              ) : (
                                <ToggleLeft size={20} className="text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">{isPro ? "Off" : "On"}</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4">
                            <button className="p-1.5 rounded-md border border-transparent group-hover:border-border hover:border-primary hover:text-primary transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>
        )}

        {/* ── FORMS TAB ── */}
        {activeTab === "forms" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <h2 className="font-display font-semibold text-sm">
                All forms ({filteredForms.length.toLocaleString()})
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search forms..."
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="pl-8 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 transition-all"
                />
              </div>
            </div>

            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                    </div>
                  </div>
                ))
              ) : filteredForms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No forms found</div>
              ) : (
                filteredForms.map((f) => {
                  const isExpanded = expandedFormId === f.id;
                  return (
                    <div key={f.id}>
                      <div className="px-6 py-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm text-foreground truncate">{f.title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[f.status] ?? ""}`}>
                                {f.status}
                              </span>
                              {f.max_responses !== null && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  cap: {f.max_responses}
                                </span>
                              )}
                              {f.allowed_domains && f.allowed_domains.length > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {f.allowed_domains.length} domain{f.allowed_domains.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{f._ownerEmail ?? f.user_id}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              to={`/forms/${f.id}/responses`}
                              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <BarChart3 size={11} /> Responses
                            </Link>
                            <a
                              href={`https://share.formqo.com/f/${f.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <ExternalLink size={11} /> View
                            </a>
                            <button
                              onClick={() => setExpandedFormId(isExpanded ? null : f.id)}
                              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                              Settings
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <FormSettingsPanel
                            form={f}
                            onClose={() => setExpandedFormId(null)}
                            onSaved={(updated) => handleFormSettingsSaved(f.id, updated)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {filteredForms.length} of {forms.length} forms
              </span>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === "analytics" && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <BarChart3 size={32} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Platform analytics</h3>
            <p className="text-sm text-muted-foreground">Growth metrics, revenue and user behaviour — coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
