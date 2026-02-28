import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

import heroForm from "@/assets/hero-form.jpg";
import {
  Sparkles, Zap, BarChart3, Shield, Globe, Webhook,
  ChevronRight, Check, Star, ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-powered questions",
    desc: "Let AI generate smart, contextual questions based on your goal. Paid plans only.",
  },
  {
    icon: Zap,
    title: "Lightning fast builder",
    desc: "Drag, drop, done. Build beautiful forms in minutes with our intuitive interface.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Understand your respondents with detailed completion rates, drop-offs, and insights.",
  },
  {
    icon: Shield,
    title: "Enterprise security",
    desc: "SOC 2 compliant. Your data is encrypted at rest and in transit. Always.",
  },
  {
    icon: Globe,
    title: "Multi-language support",
    desc: "Reach a global audience with forms in any language, auto-detected from the browser.",
  },
  {
    icon: Webhook,
    title: "Webhook & API access",
    desc: "Push responses anywhere instantly. Connect to your stack with one click.",
  },
];

const integrations = [
  { name: "Slack", color: "#4A154B", letter: "S" },
  { name: "Zapier", color: "#FF4A00", letter: "Z" },
  { name: "Webhooks", color: "#000", letter: "W" },
  { name: "HubSpot", color: "#FF7A59", letter: "H" },
  { name: "Notion", color: "#000", letter: "N" },
  { name: "Airtable", color: "#18BFFF", letter: "A" },
  { name: "Google Sheets", color: "#34A853", letter: "G" },
  { name: "Mailchimp", color: "#FFE01B", letter: "M" },
];

const plans = [
  {
    name: "Free",
    price: "£0",
    period: "/month",
    desc: "Perfect to get started",
    features: [
      "Up to 3 forms",
      "100 responses/month",
      "Basic question types",
      "Formqo branding on forms",
      "Email notifications",
    ],
    cta: "Start for free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "£19",
    period: "/month",
    desc: "For serious form builders",
    features: [
      "Unlimited forms",
      "10,000 responses/month",
      "All question types",
      "Remove Formqo branding",
      "AI question generation",
      "Custom domain",
      "Priority support",
    ],
    cta: "Start Pro trial",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Business",
    price: "£49",
    period: "/month",
    desc: "For teams & enterprises",
    features: [
      "Everything in Pro",
      "Unlimited responses",
      "Team collaboration",
      "Advanced AI features",
      "SSO & SAML",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Talk to sales",
    href: "/signup",
    highlight: false,
  },
];

const testimonials = [
  {
    quote: "Formqo replaced Typeform for us overnight. The AI suggestions alone save us hours every week.",
    name: "Sarah Chen",
    role: "Product Lead, Luminary",
    rating: 5,
  },
  {
    quote: "The Slack integration is seamless. Our team gets instant alerts on every submission.",
    name: "Marcus Webb",
    role: "Ops Director, Foundry",
    rating: 5,
  },
  {
    quote: "Finally a form tool that feels native to our brand. Clean, fast, and beautiful by default.",
    name: "Amara Okafor",
    role: "Design Lead, Prism",
    rating: 5,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles size={12} />
              AI-powered forms for the modern team
            </div>
            <h1 className="font-display font-bold text-5xl md:text-7xl text-foreground leading-[1.05] tracking-tight mb-6">
              Forms people actually<br />
              <span className="text-primary">want to fill in.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Build stunning, conversational forms in minutes. Collect better data, understand your users, and automate your workflows — all from one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base">
                Create your first form <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-outline inline-flex items-center gap-2 text-base">
                See how it works
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Free forever · No credit card required</p>
          </div>

          {/* Hero image */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl animate-fade-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <img src={heroForm} alt="Formqo form builder interface" className="w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50">
            {["Luminary", "Foundry Co.", "Prism Labs", "Meridian", "Axon Group"].map((name) => (
              <span key={name} className="font-display font-bold text-lg text-foreground">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="section-tag mb-3">Features</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground">
              Everything you need to collect<br />great responses
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card-hover p-6 rounded-2xl border border-border bg-card">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI highlight */}
      <section className="py-24 px-4 bg-foreground">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-tag text-primary mb-3">AI capabilities</p>
              <h2 className="font-display font-bold text-4xl md:text-5xl text-primary-foreground leading-tight mb-6">
                Let AI write your questions for you.
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Describe your goal and Formqo's AI generates a complete, optimised form in seconds. Available on Pro and Business plans.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Smart question suggestions based on context",
                  "Auto-detect best input type per question",
                  "AI logic branching — no coding needed",
                  "Sentiment analysis on open text responses",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check size={16} className="text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2">
                Try AI forms free <ChevronRight size={16} />
              </Link>
            </div>
            <div className="bg-muted/10 rounded-2xl border border-border/20 p-6">
              <div className="space-y-3">
                {[
                  { q: "What's your main goal today?", type: "AI suggested" },
                  { q: "How would you rate your experience?", type: "AI suggested" },
                  { q: "What could we improve?", type: "AI suggested" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 rounded-xl p-4 border border-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-primary font-semibold">{item.type}</span>
                      <Sparkles size={12} className="text-primary" />
                    </div>
                    <p className="text-primary-foreground text-sm font-medium">{item.q}</p>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">Generated in 0.8s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="section-tag mb-3">Integrations</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground">
              Connect to the tools<br />your team loves
            </h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              Send responses to Slack, trigger Zapier workflows, fire webhooks — all without writing a line of code.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {integrations.map((int) => (
              <div key={int.name} className="card-hover flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-xl"
                  style={{ backgroundColor: int.color }}
                >
                  {int.letter}
                </div>
                <span className="text-sm font-semibold text-foreground">{int.name}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              More integrations added every month · <a href="#" className="text-primary hover:underline">Request an integration</a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="section-tag mb-3">Testimonials</p>
            <h2 className="font-display font-bold text-4xl text-foreground">Loved by form builders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="card-hover bg-card rounded-2xl border border-border p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="section-tag mb-3">Pricing</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground">Simple, honest pricing</h2>
            <p className="text-muted-foreground text-lg mt-4">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "border-primary bg-primary text-primary-foreground shadow-xl scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold tracking-widest uppercase mb-4 text-primary-foreground/70">
                    Most popular
                  </div>
                )}
                <h3 className={`font-display font-bold text-2xl mb-1 ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className={`font-display font-bold text-4xl ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={15}
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
                  className={`text-center py-3 rounded-lg font-display font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : "btn-primary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            All plans include a 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-primary">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display font-bold text-4xl md:text-5xl text-primary-foreground mb-6">
            Ready to build better forms?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-10">
            Join thousands of teams collecting smarter data with Formqo.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary font-display font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:bg-primary-foreground/90 hover:scale-[1.02]"
          >
            Start building for free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      
    </div>
  );
};

export default Index;
