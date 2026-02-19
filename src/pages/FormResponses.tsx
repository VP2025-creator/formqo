import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Search, Filter, BarChart3, CheckCircle2, Clock, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockForms } from "@/data/mockForms";
import { Form, Question } from "@/types/form";
import Navbar from "@/components/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResponseRow {
  id: string;
  created_at: string;
  respondent_email?: string;
  completed: boolean;
  answers: { questionId: string; value: string | string[] | number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getAnswerDisplay(value: string | string[] | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// Export responses to CSV
function exportCSV(form: Form, responses: ResponseRow[]) {
  const headers = ["Submitted at", "Respondent email", ...form.questions.map((q) => q.title)];
  const rows = responses.map((r) => {
    const ansMap: Record<string, string> = {};
    r.answers.forEach((a) => { ansMap[a.questionId] = getAnswerDisplay(a.value); });
    return [
      formatDate(r.created_at),
      r.respondent_email ?? "",
      ...form.questions.map((q) => ansMap[q.id] ?? ""),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${form.title.replace(/\s+/g, "_")}_responses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Build chart data for a question
function buildChartData(question: Question, responses: ResponseRow[]) {
  if (question.type === "multiple_choice" || question.type === "yes_no") {
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const ans = r.answers.find((a) => a.questionId === question.id);
      if (!ans) return;
      const vals = Array.isArray(ans.value) ? ans.value : [String(ans.value)];
      vals.forEach((v) => { counts[v] = (counts[v] ?? 0) + 1; });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }
  if (question.type === "rating") {
    const max = question.maxRating ?? 5;
    const counts: Record<number, number> = {};
    for (let i = 1; i <= max; i++) counts[i] = 0;
    responses.forEach((r) => {
      const ans = r.answers.find((a) => a.questionId === question.id);
      if (ans && typeof ans.value === "number" && counts[ans.value] !== undefined) {
        counts[ans.value]++;
      }
    });
    return Object.entries(counts).map(([rating, count]) => ({ name: `★ ${rating}`, value: count }));
  }
  return [];
}

const CHART_COLORS = ["hsl(357 95% 22%)", "hsl(357 70% 40%)", "hsl(357 50% 55%)", "hsl(357 30% 70%)", "hsl(357 15% 82%)"];

// ─── Mock responses (seeded from mock form data until backend is used) ─────────
function generateMockResponses(form: Form): ResponseRow[] {
  const count = form.responses ?? 10;
  return Array.from({ length: Math.min(count, 15) }, (_, i) => {
    const date = new Date(Date.now() - i * 1000 * 60 * 60 * (i + 2));
    return {
      id: `mock-${i}`,
      created_at: date.toISOString(),
      respondent_email: i % 3 === 0 ? `user${i}@example.com` : undefined,
      completed: i % 5 !== 4,
      answers: form.questions.map((q) => {
        if (q.type === "rating") return { questionId: q.id, value: Math.ceil(Math.random() * (q.maxRating ?? 5)) };
        if (q.type === "multiple_choice" && q.options) return { questionId: q.id, value: q.options[i % q.options.length].label };
        if (q.type === "yes_no") return { questionId: q.id, value: i % 2 === 0 ? "Yes" : "No" };
        if (q.type === "email") return { questionId: q.id, value: `respondent${i}@test.com` };
        return { questionId: q.id, value: `Sample answer ${i + 1}` };
      }),
    };
  });
}

// ─── Components ───────────────────────────────────────────────────────────────

const BURGUNDY = "hsl(357 95% 22%)";

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <p className="font-display font-bold text-2xl text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const FormResponses = () => {
  const { formId } = useParams<{ formId: string }>();
  const form = mockForms.find((f) => f.id === formId);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"table" | "analytics">("table");

  useEffect(() => {
    if (!form) return;
    // Try real DB first, fall back to mock
    const load = async () => {
      const { data } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResponses(data.map((r) => ({ ...r, answers: Array.isArray(r.answers) ? (r.answers as any[]) : [] })) as ResponseRow[]);
      } else {
        setResponses(generateMockResponses(form));
      }
    };
    load();
  }, [form, formId]);

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl mb-2">Form not found</h1>
          <Link to="/dashboard" className="text-primary hover:underline text-sm">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const filtered = responses.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.respondent_email ?? "").toLowerCase().includes(q) ||
      r.answers.some((a) => getAnswerDisplay(a.value).toLowerCase().includes(q))
    );
  });

  const completedCount = responses.filter((r) => r.completed).length;
  const completionRate = responses.length > 0 ? Math.round((completedCount / responses.length) * 100) : 0;
  const emailCount = responses.filter((r) => r.respondent_email).length;

  // Chartable questions
  const chartableQs = form.questions.filter((q) =>
    ["multiple_choice", "yes_no", "rating"].includes(q.type)
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole="user" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="font-display font-bold text-2xl text-foreground">{form.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{responses.length} responses collected</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/builder?id=${form.id}`} className="btn-outline flex items-center gap-2 text-sm py-2">
              Edit form
            </Link>
            <button
              onClick={() => exportCSV(form, filtered)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total responses"   value={responses.length}  icon={Users}       sub={`${form.views ?? 0} views`} />
          <StatCard label="Completed"         value={completedCount}    icon={CheckCircle2} sub={`${completionRate}% rate`} />
          <StatCard label="With email"        value={emailCount}        icon={TrendingUp}   sub="identifiable" />
          <StatCard label="Avg. completion"   value={`${completionRate}%`} icon={BarChart3} sub="all time" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
          {(["table", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                activeTab === tab ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Table view ── */}
        {activeTab === "table" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Search + filter bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search responses..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} results</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    {form.questions.slice(0, 3).map((q) => (
                      <th key={q.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide max-w-[180px] truncate">
                        {q.title}
                      </th>
                    ))}
                    {form.questions.length > 3 && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">+{form.questions.length - 3} more</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={form.questions.length + 2} className="text-center py-12 text-muted-foreground text-sm">
                        No responses found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const ansMap: Record<string, string> = {};
                      r.answers.forEach((a) => { ansMap[a.questionId] = getAnswerDisplay(a.value); });
                      return (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            <div>{formatDate(r.created_at)}</div>
                            {r.respondent_email && (
                              <div className="text-primary mt-0.5 truncate max-w-[160px]">{r.respondent_email}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r.completed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {r.completed ? "Complete" : "Partial"}
                            </span>
                          </td>
                          {form.questions.slice(0, 3).map((q) => (
                            <td key={q.id} className="px-4 py-3 text-sm text-foreground max-w-[180px]">
                              <span className="line-clamp-1">{ansMap[q.id] ?? "—"}</span>
                            </td>
                          ))}
                          {form.questions.length > 3 && <td className="px-4 py-3 text-muted-foreground text-xs">…</td>}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Analytics view ── */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Completion over time (simple bar) */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-display font-semibold text-sm mb-4">Responses over time</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={responses.slice(0, 10).map((r, i) => ({
                  name: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                  responses: 1,
                })).reduce((acc: { name: string; responses: number }[], cur) => {
                  const existing = acc.find(a => a.name === cur.name);
                  if (existing) existing.responses++;
                  else acc.push(cur);
                  return acc;
                }, [])}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="responses" fill={BURGUNDY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-question charts */}
            {chartableQs.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
                <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Add rating or multiple-choice questions to see answer distributions.</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {chartableQs.map((q) => {
                const data = buildChartData(q, responses);
                if (data.length === 0) return null;
                const isPie = q.type === "yes_no" || (q.type === "multiple_choice" && (q.options?.length ?? 0) <= 4);
                return (
                  <div key={q.id} className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-display font-semibold text-sm mb-1 leading-tight">{q.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {responses.filter(r => r.answers.find(a => a.questionId === q.id)).length} answered
                    </p>
                    {isPie ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                            {data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                          <Tooltip />
                          <Bar dataKey="value" fill={BURGUNDY} radius={[0, 4, 4, 0]}>
                            {data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponses;
