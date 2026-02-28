import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

import { Check, Minus, Zap, ArrowRight, Sparkles } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";

const features = [
  // Category: Forms
  { category: "Forms", name: "Number of forms", free: "3", pro: "Unlimited", business: "Unlimited" },
  { category: "Forms", name: "Question types", free: "Basic (5)", pro: "All (15+)", business: "All (15+)" },
  { category: "Forms", name: "File uploads", free: false, pro: true, business: true },
  { category: "Forms", name: "Custom branding", free: false, pro: true, business: true },
  { category: "Forms", name: "Remove Formqo badge", free: false, pro: true, business: true },
  { category: "Forms", name: "Custom domain", free: false, pro: true, business: true },

  // Category: Responses
  { category: "Responses", name: "Monthly responses", free: "100", pro: "10,000", business: "Unlimited" },
  { category: "Responses", name: "Response export (CSV)", free: true, pro: true, business: true },
  { category: "Responses", name: "Email notifications", free: true, pro: true, business: true },
  { category: "Responses", name: "Spam protection", free: true, pro: true, business: true },
  { category: "Responses", name: "Domain allowlist", free: false, pro: true, business: true },

  // Category: AI
  { category: "AI", name: "AI question suggestions", free: false, pro: true, business: true },
  { category: "AI", name: "AI logic branching", free: false, pro: true, business: true },
  { category: "AI", name: "Sentiment analysis", free: false, pro: false, business: true },
  { category: "AI", name: "Advanced AI analytics", free: false, pro: false, business: true },

  // Category: Integrations
  { category: "Integrations", name: "Webhook", free: false, pro: true, business: true },
  { category: "Integrations", name: "Slack", free: false, pro: true, business: true },
  { category: "Integrations", name: "Zapier / Make", free: false, pro: true, business: true },
  { category: "Integrations", name: "API access", free: false, pro: true, business: true },

  // Category: Team & Security
  { category: "Team & Security", name: "Team members", free: "1", pro: "5", business: "Unlimited" },
  { category: "Team & Security", name: "Role-based access", free: false, pro: false, business: true },
  { category: "Team & Security", name: "SSO / SAML", free: false, pro: false, business: true },
  { category: "Team & Security", name: "Audit logs", free: false, pro: false, business: true },
  { category: "Team & Security", name: "SLA guarantee", free: false, pro: false, business: true },

  // Category: Support
  { category: "Support", name: "Community support", free: true, pro: true, business: true },
  { category: "Support", name: "Priority email support", free: false, pro: true, business: true },
  { category: "Support", name: "Dedicated account manager", free: false, pro: false, business: true },
];

const plans = [
  {
    key: "free" as const,
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "£",
    desc: "Perfect to get started",
    cta: "Start for free",
    href: "/signup",
    highlight: false,
    badge: null,
  },
  {
    key: "pro" as const,
    name: "Pro",
    monthlyPrice: 19,
    annualPrice: 15,
    currency: "£",
    desc: "For serious form builders",
    cta: "Start Pro trial",
    href: "/signup",
    highlight: true,
    badge: "Most popular",
  },
  {
    key: "business" as const,
    name: "Business",
    monthlyPrice: 49,
    annualPrice: 39,
    currency: "£",
    desc: "For teams & enterprises",
    cta: "Talk to sales",
    href: "/signup",
    highlight: false,
    badge: null,
  },
];

const topFeatures = {
  free: ["3 forms", "100 responses/mo", "Basic question types", "Email notifications"],
  pro: ["Unlimited forms", "10,000 responses/mo", "All question types", "AI question suggestions", "Custom domain", "Priority support"],
  business: ["Everything in Pro", "Unlimited responses", "Team collaboration", "Advanced AI & analytics", "SSO & SAML", "Dedicated support"],
};

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={16} className="text-primary mx-auto" />;
  if (value === false) return <Minus size={14} className="text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

const Pricing = () => {
  const [annual, setAnnual] = useState(false);

  usePageMeta({
    title: "Pricing — Formqo | Simple, Honest Plans",
    description: "Start free. Upgrade to Pro for £15/mo or Business for £39/mo. Unlock unlimited forms, AI question generation, and custom domains.",
    ogImage: "https://formqo.lovable.app/og-pricing.png",
    ogType: "website",
    twitterCard: "summary_large_image",
  });


  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <p className="section-tag mb-3">Pricing</p>
          <h1 className="font-display font-bold text-5xl md:text-6xl text-foreground leading-[1.05] tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            Start free, no credit card required. Upgrade when you're ready.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-secondary rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice;
              const features_ = topFeatures[plan.key];
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-200 ${
                    plan.highlight
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_20px_60px_-10px_hsl(357_95%_22%/0.35)] md:-translate-y-2"
                      : "border-border bg-card shadow-sm"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-background text-primary text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border border-primary/30 shadow-sm">
                        <Zap size={10} className="fill-primary" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h2 className={`font-display font-bold text-2xl mb-1 ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                      {plan.name}
                    </h2>
                    <p className={`text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {plan.desc}
                    </p>
                  </div>

                  <div className="mb-7 flex items-end gap-1">
                    <span className={`font-display font-bold text-5xl leading-none ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                      {plan.currency}{price}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      /month{annual && plan.monthlyPrice > 0 ? ", billed annually" : ""}
                    </span>
                  </div>

                  {annual && plan.monthlyPrice > 0 && (
                    <p className={`text-xs mb-4 -mt-4 ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      vs {plan.currency}{plan.monthlyPrice}/mo billed monthly
                    </p>
                  )}

                  <ul className="space-y-3 mb-8 flex-1">
                    {features_.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          size={14}
                          className={`mt-0.5 shrink-0 ${plan.highlight ? "text-primary-foreground" : "text-primary"}`}
                        />
                        <span className={`text-sm ${plan.highlight ? "text-primary-foreground/90" : "text-foreground"}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.href}
                    className={`inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-display font-semibold text-sm transition-all duration-200 hover:scale-[1.02] ${
                      plan.highlight
                        ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                        : plan.key === "free"
                        ? "border border-border bg-background text-foreground hover:border-primary hover:text-primary"
                        : "btn-primary"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            All paid plans include a 14-day free trial · Cancel anytime · No hidden fees
          </p>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="pb-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="section-tag mb-3">Compare plans</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground">
              Everything, side by side
            </h2>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-4 bg-muted/50 border-b border-border">
              <div className="p-5 col-span-1">
                <span className="text-sm font-semibold text-muted-foreground">Feature</span>
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className={`p-5 text-center border-l border-border ${plan.highlight ? "bg-primary/5" : ""}`}
                >
                  <span className={`font-display font-bold text-base ${plan.highlight ? "text-primary" : "text-foreground"}`}>
                    {plan.name}
                  </span>
                </div>
              ))}
            </div>

            {categories.map((cat, ci) => (
              <div key={cat}>
                {/* Category header */}
                <div className="grid grid-cols-4 bg-muted/20 border-b border-border">
                  <div className="p-4 col-span-4">
                    <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{cat}</span>
                  </div>
                </div>

                {/* Feature rows */}
                {features.filter((f) => f.category === cat).map((feat, fi) => (
                  <div
                    key={feat.name}
                    className={`grid grid-cols-4 border-b border-border/60 hover:bg-muted/20 transition-colors ${
                      fi === features.filter((f) => f.category === cat).length - 1 && ci === categories.length - 1
                        ? "border-b-0"
                        : ""
                    }`}
                  >
                    <div className="p-4 px-5">
                      <span className="text-sm text-foreground">{feat.name}</span>
                    </div>
                    {(["free", "pro", "business"] as const).map((key) => {
                      const plan = plans.find((p) => p.key === key)!;
                      return (
                        <div
                          key={key}
                          className={`p-4 text-center border-l border-border/60 flex items-center justify-center ${plan.highlight ? "bg-primary/5" : ""}`}
                        >
                          <FeatureCell value={feat[key]} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / trust strip */}
      <section className="py-16 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="section-tag mb-3">FAQ</p>
          <div className="grid md:grid-cols-2 gap-8 text-left mt-8">
            {[
              {
                q: "Can I change plans later?",
                a: "Yes — upgrade, downgrade or cancel anytime. Changes take effect at the next billing cycle.",
              },
              {
                q: "What happens when I hit the response limit?",
                a: "New submissions are paused and you're notified. Your existing data is always safe.",
              },
              {
                q: "Is there a free trial on paid plans?",
                a: "Yes! Every paid plan includes a 14-day free trial — no credit card required.",
              },
              {
                q: "Do you offer discounts for nonprofits or education?",
                a: "Yes. Contact us at hello@formqo.com and we'll set you up with a discounted plan.",
              },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="font-display font-semibold text-base text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-primary">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={12} />
            Start building for free today
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-primary-foreground mb-6">
            Ready to collect smarter data?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-10">
            Join thousands of teams already using Formqo. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary font-display font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:bg-primary-foreground/90 hover:scale-[1.02]"
            >
              Start free — no card needed <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground font-display font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:bg-primary-foreground/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      
    </div>
  );
};

export default Pricing;
