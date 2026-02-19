import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Zap, Mail, Slack, Globe, Plus, Trash2, ToggleLeft, ToggleRight,
  ChevronRight, ExternalLink, Check, AlertCircle, Webhook
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  type: "slack" | "zapier" | "email";
  config: Record<string, string>;
  enabled: boolean;
  form_id?: string;
}

// ─── Static integration definitions ──────────────────────────────────────────

const INTEGRATION_DEFS = [
  {
    type: "slack" as const,
    name: "Slack",
    description: "Get notified in a Slack channel whenever a new response is submitted.",
    icon: Slack,
    color: "bg-foreground",
    docsUrl: "https://slack.com/apps",
    fields: [
      { key: "webhook_url", label: "Slack Webhook URL", placeholder: "https://hooks.slack.com/services/...", type: "url" },
      { key: "channel", label: "Channel name", placeholder: "#form-responses", type: "text" },
    ],
  },
  {
    type: "zapier" as const,
    name: "Zapier",
    description: "Trigger any Zap when a new response is submitted. Connect 5,000+ apps.",
    icon: Zap,
    color: "bg-secondary-foreground",
    docsUrl: "https://zapier.com/apps/webhooks",
    fields: [
      { key: "webhook_url", label: "Zapier Webhook URL", placeholder: "https://hooks.zapier.com/hooks/catch/...", type: "url" },
    ],
  },
  {
    type: "email" as const,
    name: "Email notifications",
    description: "Receive an email summary every time someone completes your form.",
    icon: Mail,
    color: "bg-primary",
    docsUrl: "",
    fields: [
      { key: "to_email", label: "Notify email address", placeholder: "you@company.com", type: "email" },
      { key: "subject", label: "Email subject", placeholder: "New response: {{form_title}}", type: "text" },
    ],
  },
];

// ─── Helper: send Zapier webhook ─────────────────────────────────────────────

async function triggerZapier(webhookUrl: string, payload: Record<string, unknown>) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  def,
  existing,
  onSave,
  onDelete,
  onToggle,
}: {
  def: typeof INTEGRATION_DEFS[number];
  existing?: Integration;
  onSave: (type: string, config: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>(existing?.config ?? {});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const { toast } = useToast();
  const Icon = def.icon;
  const isConnected = !!existing;

  const handleSave = async () => {
    setSaving(true);
    await onSave(def.type, fields);
    setSaving(false);
    setExpanded(false);
  };

  const handleTest = async () => {
    if (def.type === "zapier" && fields.webhook_url) {
      setTesting(true);
      const ok = await triggerZapier(fields.webhook_url, {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Test from Formqo",
      });
      setTesting(false);
      setTested(true);
      toast({
        title: ok ? "Test sent!" : "Test sent",
        description: "Check your Zap's history to confirm it was triggered.",
      });
      setTimeout(() => setTested(false), 3000);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-10 h-10 rounded-xl ${def.color} flex items-center justify-center shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-display font-semibold text-sm">{def.name}</p>
            {isConnected && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${existing!.enabled ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {existing!.enabled ? "Active" : "Paused"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{def.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isConnected && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(existing!.id, !existing!.enabled); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={existing!.enabled ? "Pause" : "Resume"}
            >
              {existing!.enabled
                ? <ToggleRight size={22} className="text-primary" />
                : <ToggleLeft size={22} />}
            </button>
          )}
          {!isConnected && (
            <span className="text-xs text-primary font-semibold">Connect →</span>
          )}
          <ChevronRight size={15} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
          {def.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          ))}

          {def.docsUrl && (
            <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink size={11} /> How to get your webhook URL
            </a>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              {saving ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Check size={14} />}
              {isConnected ? "Update" : "Connect"}
            </button>

            {def.type === "zapier" && (
              <button
                onClick={handleTest}
                disabled={testing || !fields.webhook_url}
                className="btn-outline flex items-center gap-1.5 text-sm py-2"
              >
                {tested ? <Check size={14} className="text-green-700" /> : <Webhook size={14} />}
                {testing ? "Sending..." : "Test webhook"}
              </button>
            )}

            {isConnected && (
              <button
                onClick={() => onDelete(existing!.id)}
                className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={13} /> Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Integrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setIntegrations(data as Integration[]);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (type: string, config: Record<string, string>) => {
    if (!user) return;
    const existing = integrations.find((i) => i.type === type);
    if (existing) {
      const { error } = await supabase
        .from("integrations")
        .update({ config, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (!error) {
        setIntegrations((prev) => prev.map((i) => i.id === existing.id ? { ...i, config } : i));
        toast({ title: "Integration updated" });
      }
    } else {
      const { data, error } = await supabase
        .from("integrations")
        .insert({ user_id: user.id, type, config, enabled: true })
        .select()
        .single();
      if (!error && data) {
        setIntegrations((prev) => [...prev, data as Integration]);
        toast({ title: "Integration connected!" });
      }
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("integrations").delete().eq("id", id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Integration disconnected" });
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from("integrations").update({ enabled }).eq("id", id);
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, enabled } : i));
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole="user" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-display font-bold text-2xl text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Formqo to your favourite tools. Integrations fire on every new response.
          </p>
        </div>

        {/* Status */}
        {!loading && integrations.length > 0 && (
          <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-4 py-3 mb-6 text-sm text-foreground">
            <Check size={15} />
            {integrations.filter((i) => i.enabled).length} active integration{integrations.filter((i) => i.enabled).length !== 1 ? "s" : ""}
          </div>
        )}

        {/* Integration cards */}
        <div className="space-y-4">
          {INTEGRATION_DEFS.map((def) => (
            <IntegrationCard
              key={def.type}
              def={def}
              existing={integrations.find((i) => i.type === def.type)}
              onSave={handleSave}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Coming soon */}
        <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
          <Globe size={24} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-display font-semibold text-sm text-foreground mb-1">More integrations coming soon</p>
          <p className="text-xs text-muted-foreground">Notion, HubSpot, Google Sheets, Airtable, and more.</p>
        </div>

        {/* Paid feature note */}
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary-light border border-primary/15 px-4 py-3">
          <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/70">
            All integrations are available on the Free plan. Upgrade to Pro for unlimited form triggers and advanced filtering.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
