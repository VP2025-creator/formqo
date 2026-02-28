import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, BarChart3, CheckCircle2, Users,
  TrendingUp, Clock, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Form, Question } from "@/types/form";
import Navbar from "@/components/Navbar";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  CartesianGrid, LineChart, Line,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResponseRow {
  id: string;
  created_at: string;
  respondent_email?: string | null;
  completed: boolean;
  answers: { questionId: string; value: string | string[] | number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "hsl(357 95% 22%)",
  "hsl(357 65% 40%)",
  "hsl(357 45% 55%)",
  "hsl(220 60% 55%)",
  "hsl(160 50% 45%)",
  "hsl(40 80% 55%)",
  "hsl(280 50% 55%)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAnswerDisplay(value: string | string[] | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildDailyTrend(responses: ResponseRow[]) {
  const byDay: Record<string, { date: string; responses: number; completed: number }> = {};
  responses.forEach((r) => {
    const day = new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (!byDay[day]) byDay[day] = { date: day, responses: 0, completed: 0 };
    byDay[day].responses++;
    if (r.completed) byDay[day].completed++;
  });
  return Object.values(byDay).slice(-30);
}

function buildWeeklyTrend(responses: ResponseRow[]) {
  const byWeek: Record<string, { week: string; responses: number }> = {};
  responses.forEach((r) => {
    const d = new Date(r.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const label = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (!byWeek[label]) byWeek[label] = { week: label, responses: 0 };
    byWeek[label].responses++;
  });
  return Object.values(byWeek).slice(-12);
}

function buildCompletionData(responses: ResponseRow[]) {
  const completed = responses.filter((r) => r.completed).length;
  const partial = responses.length - completed;
  return [
    { name: "Completed", value: completed },
    { name: "Partial", value: partial },
  ].filter((d) => d.value > 0);
}

function buildDropOff(form: Form, responses: ResponseRow[]) {
  return form.questions.map((q, idx) => {
    const answered = responses.filter((r) =>
      r.answers.some((a) => a.questionId === q.id && getAnswerDisplay(a.value) !== "—")
    ).length;
    const pct = responses.length > 0 ? Math.round((answered / responses.length) * 100) : 0;
    return { name: `Q${idx + 1}`, question: q.title, answered, pct };
  });
}

function buildQuestionChart(question: Question, responses: ResponseRow[]) {
  if (question.type === "multiple_choice" || question.type === "yes_no" || question.type === "dropdown") {
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

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name}: <span className="text-foreground font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <h3 className="font-display font-semibold text-sm text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const FormAnalytics = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId) return;
    const load = async () => {
      const [formRes, respRes] = await Promise.all([
        supabase.from("forms").select("*").eq("id", formId).single(),
        supabase.from("form_responses").select("*").eq("form_id", formId).order("created_at", { ascending: false }),
      ]);

      if (formRes.data) {
        const d = formRes.data;
        setForm({
          id: d.id,
          title: d.title,
          description: d.description ?? undefined,
          questions: Array.isArray(d.questions) ? (d.questions as unknown as Question[]) : [],
          settings: (d.settings as unknown as Form["settings"]) ?? { primaryColor: "hsl(357 95% 22%)", showBranding: true },
          status: d.status as Form["status"],
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        });
      }
      if (respRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResponses(respRes.data.map((r) => ({ ...r, answers: Array.isArray(r.answers) ? (r.answers as any[]) : [] })) as ResponseRow[]);
      }
      setLoading(false);
    };
    load();
  }, [formId]);

  const completedCount = useMemo(() => responses.filter((r) => r.completed).length, [responses]);
  const completionRate = responses.length > 0 ? Math.round((completedCount / responses.length) * 100) : 0;
  const avgPerDay = useMemo(() => {
    if (responses.length < 2) return responses.length;
    const first = new Date(responses[responses.length - 1].created_at).getTime();
    const last = new Date(responses[0].created_at).getTime();
    const days = Math.max(1, Math.ceil((last - first) / 86400000));
    return (responses.length / days).toFixed(1);
  }, [responses]);

  const dailyTrend = useMemo(() => buildDailyTrend(responses), [responses]);
  const weeklyTrend = useMemo(() => buildWeeklyTrend(responses), [responses]);
  const completionData = useMemo(() => buildCompletionData(responses), [responses]);
  const dropOffData = useMemo(() => form ? buildDropOff(form, responses) : [], [form, responses]);
  const chartableQs = useMemo(
    () => form?.questions.filter((q) => ["multiple_choice", "yes_no", "rating", "dropdown"].includes(q.type)) ?? [],
    [form]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <h1 className="font-display font-bold text-2xl text-foreground">{form.title} — Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">{responses.length} total responses</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/forms/${form.id}/responses`} className="btn-outline flex items-center gap-2 text-sm py-2">
              <MessageSquare size={14} /> View responses
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total responses" value={responses.length} icon={Users} />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} sub={`${completionRate}% rate`} />
          <StatCard label="Avg / day" value={avgPerDay} icon={TrendingUp} />
          <StatCard label="Questions" value={form.questions.length} icon={BarChart3} />
        </div>

        {responses.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <BarChart3 size={40} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">No responses yet — analytics will appear here once you start collecting data.</p>
            <Link to={`/builder?id=${form.id}`} className="text-sm text-primary hover:underline">Open form builder →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Response trend — daily */}
            <Section title="Response trend (daily)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="responses" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} strokeWidth={2} name="Total" />
                    <Area type="monotone" dataKey="completed" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.1} strokeWidth={2} name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* Weekly trend + Completion pie */}
            <div className="grid md:grid-cols-2 gap-6">
              <Section title="Weekly volume">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="responses" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Responses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section title="Completion rate">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={completionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                        {completionData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? CHART_COLORS[4] : CHART_COLORS[2]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            {/* Drop-off funnel */}
            <Section title="Per-question completion (drop-off)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dropOffData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg max-w-[220px]">
                            <p className="font-semibold text-foreground mb-1 truncate">{d.question}</p>
                            <p className="text-muted-foreground">{d.answered} answered · {d.pct}%</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pct" name="Answered %" radius={[0, 4, 4, 0]}>
                      {dropOffData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-1">
                {dropOffData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground w-8">{d.name}</span>
                    <span className="truncate">{d.question}</span>
                    <span className="ml-auto font-medium text-foreground">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Per-question breakdown */}
            {chartableQs.length > 0 && (
              <Section title="Per-question breakdown">
                <div className="grid md:grid-cols-2 gap-6">
                  {chartableQs.map((q) => {
                    const data = buildQuestionChart(q, responses);
                    if (data.length === 0) return null;
                    return (
                      <div key={q.id} className="border border-border rounded-xl p-4">
                        <p className="text-xs font-semibold text-foreground mb-1 truncate">{q.title}</p>
                        <p className="text-[11px] text-muted-foreground mb-3 capitalize">{q.type.replace("_", " ")}</p>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            {q.type === "rating" ? (
                              <BarChart data={data}>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                  {data.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            ) : (
                              <PieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" nameKey="name">
                                  {data.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                              </PieChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormAnalytics;
