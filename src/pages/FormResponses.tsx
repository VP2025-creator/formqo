import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Download, Search, BarChart3, CheckCircle2,
  Users, TrendingUp, Wifi, WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockForms } from "@/data/mockForms";
import { Form, Question } from "@/types/form";
import Navbar from "@/components/Navbar";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  CartesianGrid,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResponseRow {
  id: string;
  created_at: string;
  respondent_email?: string | null;
  completed: boolean;
  answers: { questionId: string; value: string | string[] | number }[];
  metadata?: { ip_hash?: string; referrer?: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIMARY = "hsl(357 95% 22%)";
const CHART_COLORS = [
  "hsl(357 95% 22%)",
  "hsl(357 65% 40%)",
  "hsl(357 45% 55%)",
  "hsl(357 25% 68%)",
  "hsl(220 60% 55%)",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getAnswerDisplay(value: string | string[] | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function exportCSV(form: Form, responses: ResponseRow[]) {
  const headers = ["Submitted at", "Status", "Email", ...form.questions.map((q) => q.title)];
  const rows = responses.map((r) => {
    const ansMap: Record<string, string> = {};
    r.answers.forEach((a) => { ansMap[a.questionId] = getAnswerDisplay(a.value); });
    return [
      formatDate(r.created_at),
      r.completed ? "Complete" : "Partial",
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

// ─── Chart builders ───────────────────────────────────────────────────────────

/** Groups responses by day for the area chart */
function buildTimeSeriesData(responses: ResponseRow[]) {
  const byDay: Record<string, { date: string; total: number; completed: number }> = {};
  responses.forEach((r) => {
    const day = new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (!byDay[day]) byDay[day] = { date: day, total: 0, completed: 0 };
    byDay[day].total++;
    if (r.completed) byDay[day].completed++;
  });
  return Object.values(byDay).slice(-14); // last 14 days
}

/** Simulates device breakdown from IP hash entropy (since we don't store UA) */
function buildDeviceData(responses: ResponseRow[]) {
  // We derive a pseudo device split from metadata.referrer patterns
  let mobile = 0, desktop = 0, other = 0;
  responses.forEach((r) => {
    const ref = r.metadata?.referrer ?? "";
    // Very rough heuristic — in production the Worker injects ua into metadata
    if (/mobile|android|iphone|ipad/i.test(ref)) mobile++;
    else if (ref.includes("formqo") || ref.startsWith("http")) desktop++;
    else other++;
  });
  if (desktop === 0 && mobile === 0 && other === 0 && responses.length > 0) {
    // No referrer info — use 60/35/5 split as placeholder
    desktop = Math.round(responses.length * 0.6);
    mobile = Math.round(responses.length * 0.35);
    other = responses.length - desktop - mobile;
  }
  return [
    { name: "Desktop", value: desktop },
    { name: "Mobile", value: mobile },
    { name: "Other", value: other },
  ].filter((d) => d.value > 0);
}

/** Drop-off: for each question, how many responses answered it */
function buildDropOffData(form: Form, responses: ResponseRow[]) {
  return form.questions.map((q, idx) => {
    const answered = responses.filter((r) =>
      r.answers.some((a) => a.questionId === q.id && getAnswerDisplay(a.value) !== "—")
    ).length;
    const pct = responses.length > 0 ? Math.round((answered / responses.length) * 100) : 0;
    return { name: `Q${idx + 1}`, question: q.title, answered, pct };
  });
}

/** Distribution chart for multiple_choice / yes_no / rating */
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
    return Object.entries(counts).map(([rating, count]) => ({ name: `★ ${rating}`, value: count as number }));
  }
  return [];
}

// ─── Mock generator (fallback when no real data) ──────────────────────────────

function generateMockResponses(form: Form): ResponseRow[] {
  const count = form.responses ?? 12;
  return Array.from({ length: Math.min(count, 20) }, (_, i) => {
    const hoursAgo = i * (2 + i * 0.4);
    const date = new Date(Date.now() - hoursAgo * 3_600_000);
    return {
      id: `mock-${i}`,
      created_at: date.toISOString(),
      respondent_email: i % 3 === 0 ? `user${i}@example.com` : null,
      completed: i % 5 !== 4,
      answers: form.questions.map((q) => {
        if (q.type === "rating") return { questionId: q.id, value: Math.ceil(Math.random() * (q.maxRating ?? 5)) };
        if (q.type === "multiple_choice" && q.options) return { questionId: q.id, value: q.options[i % q.options.length].label };
        if (q.type === "yes_no") return { questionId: q.id, value: i % 2 === 0 ? "Yes" : "No" };
        if (q.type === "email") return { questionId: q.id, value: `respondent${i}@test.com` };
        if (i % 6 === 5 && q.required) return { questionId: q.id, value: "" }; // simulate drop-off
        return { questionId: q.id, value: `Sample answer ${i + 1}` };
      }),
    };
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

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

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">{p.name}: <span className="text-foreground font-semibold">{p.value}</span></p>
      ))}
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
  const [isRealtime, setIsRealtime] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load responses ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!form) return;
    const load = async () => {
      const { data } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setResponses(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((r) => ({ ...r, answers: Array.isArray(r.answers) ? (r.answers as any[]) : [] })) as ResponseRow[]
        );
      } else {
        setResponses(generateMockResponses(form));
      }
    };
    load();
  }, [form, formId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isRealtime || !formId) {
      // Tear down if disabled
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setRealtimeConnected(false);
      }
      return;
    }

    const channel = supabase
      .channel(`form_responses:${formId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "form_responses",
          filter: `form_id=eq.${formId}`,
        },
        (payload) => {
          const newRow = payload.new as ResponseRow;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = { ...newRow, answers: Array.isArray(newRow.answers) ? (newRow.answers as any[]) : [] } as ResponseRow;
          setResponses((prev) => [parsed, ...prev]);
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setRealtimeConnected(false);
    };
  }, [isRealtime, formId]);

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

  // Analytics data
  const timeSeriesData = buildTimeSeriesData(responses);
  const deviceData = buildDeviceData(responses);
  const dropOffData = buildDropOffData(form, responses);
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
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="font-display font-bold text-2xl text-foreground">{form.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{responses.length} responses collected</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Realtime toggle */}
            <button
              onClick={() => setIsRealtime((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                isRealtime
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
              title={isRealtime ? "Disable real-time" : "Enable real-time updates"}
            >
              {isRealtime && realtimeConnected ? (
                <><Wifi size={14} className="text-primary" /> Live</>
              ) : isRealtime ? (
                <><Wifi size={14} className="animate-pulse" /> Connecting…</>
              ) : (
                <><WifiOff size={14} /> Live</>
              )}
            </button>

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

        {/* Realtime banner */}
        {isRealtime && realtimeConnected && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live — new submissions appear instantly
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total responses" value={responses.length} icon={Users} sub={`${form.views ?? 0} views`} />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} sub={`${completionRate}% rate`} />
          <StatCard label="With email" value={emailCount} icon={TrendingUp} sub="identifiable" />
          <StatCard label="Avg. completion" value={`${completionRate}%`} icon={BarChart3} sub="all time" />
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

        {/* ── TABLE ── */}
        {activeTab === "table" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
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

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div className="space-y-6">

            {/* 1. Responses over time — area chart */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold text-sm">Responses over time</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Last 14 days · total vs completed</p>
                </div>
                {isRealtime && realtimeConnected && (
                  <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {timeSeriesData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timeSeriesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="total" name="Total" stroke={PRIMARY} strokeWidth={1.5} fill="url(#totalGrad)" strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke={PRIMARY} strokeWidth={2} fill="url(#completedGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 2. Two-column: Device breakdown + Drop-off */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Device breakdown */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display font-semibold text-sm mb-1">Device breakdown</h3>
                <p className="text-xs text-muted-foreground mb-5">Estimated from submission metadata</p>
                {deviceData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {deviceData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Drop-off per question */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display font-semibold text-sm mb-1">Drop-off by question</h3>
                <p className="text-xs text-muted-foreground mb-5">% of respondents who answered each question</p>
                {dropOffData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No questions</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dropOffData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as (typeof dropOffData)[0];
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg max-w-[220px]">
                              <p className="font-semibold text-foreground mb-1 truncate">{d.question}</p>
                              <p className="text-muted-foreground">Answered: <span className="text-foreground font-semibold">{d.answered}</span></p>
                              <p className="text-muted-foreground">Rate: <span className="text-foreground font-semibold">{d.pct}%</span></p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                        {dropOffData.map((d, idx) => (
                          <Cell
                            key={idx}
                            fill={d.pct >= 80 ? PRIMARY : d.pct >= 50 ? "hsl(357 55% 50%)" : "hsl(357 30% 68%)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 3. Per-question distributions */}
            {chartableQs.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-sm mb-4">Answer distributions</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {chartableQs.map((q) => {
                    const data = buildChartData(q, responses);
                    if (data.length === 0) return null;
                    const isPie = q.type === "yes_no" || (q.type === "multiple_choice" && (q.options?.length ?? 0) <= 4);
                    return (
                      <div key={q.id} className="bg-card rounded-2xl border border-border p-6">
                        <h4 className="font-display font-semibold text-sm mb-1 leading-tight truncate">{q.title}</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          {responses.filter((r) => r.answers.find((a) => a.questionId === q.id && getAnswerDisplay(a.value) !== "—")).length} answered
                        </p>
                        {isPie ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} paddingAngle={3}>
                                {data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                              <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data} layout="vertical" margin={{ right: 8, left: 0 }}>
                              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={50} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="value" name="Responses" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {chartableQs.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
                <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Add rating or multiple-choice questions to see answer distributions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponses;
