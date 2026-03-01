import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ["", "bg-destructive", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
    } else {
      toast({
        title: "Account created!",
        description: "Check your email to verify your account, then sign in.",
      });
      navigate("/login");
    }
  };

  const perks = ["3 forms free, forever", "No credit card required", "Set up in under 2 minutes"];

  return (
    <div className="min-h-screen flex">
      <Helmet>
        <title>Create Account — Formqo | Free AI Form Builder</title>
        <meta name="description" content="Create your free Formqo account. Build beautiful AI-powered forms in minutes. No credit card required." />
        <link rel="canonical" href="https://app.formqo.com/signup" />
        <meta property="og:title" content="Create Account — Formqo | Free AI Form Builder" />
        <meta property="og:description" content="Create your free Formqo account. Build beautiful AI-powered forms in minutes." />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div className="hidden lg:flex lg:w-1/2 bg-foreground flex-col justify-between p-12">
        <Logo height={28} invert className="mb-0" />
        <div>
          <h2 className="font-display font-bold text-4xl text-primary-foreground leading-tight mb-8">
            Build forms that<br /><span className="text-primary">actually convert.</span>
          </h2>
          <ul className="space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check size={12} className="text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/80 text-sm">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-primary-foreground/40 text-xs">Join 12,000+ teams already using Formqo</div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <Logo height={24} className="mb-10 lg:hidden" />
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">Create your account</h1>
            <p className="text-muted-foreground text-sm">Free forever. No credit card needed.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-10 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColors[passwordStrength] : "bg-border"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strengthLabels[passwordStrength]}</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Create account <ArrowRight size={15} /></>
              )}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing up you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms</a>{" "}
            and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
