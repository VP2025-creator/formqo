import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  User, KeyRound, CreditCard, Trash2, Upload,
  Loader2, Check, ArrowRight, Shield, AlertTriangle,
} from "lucide-react";

const planLabels: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", color: "bg-primary/10 text-primary" },
  business: { label: "Business", color: "bg-amber-50 text-amber-700" },
  admin: { label: "Admin · Unlimited", color: "bg-primary text-primary-foreground" },
};

type Section = "profile" | "password" | "plan" | "danger";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<Section>("profile");

  // Profile state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    supabase
      .from("profiles")
      .select("full_name, avatar_url, plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
          setPlan(data.plan ?? "free");
        }
      });
  }, [user, navigate]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    // Try to upload; bucket may not exist so we fall back to a data URL preview
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      setAvatarUrl(url);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      toast({ title: "Avatar updated!" });
    } else {
      // Fallback: show local preview without persisting
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
      toast({ title: "Avatar preview set", description: "Storage bucket not configured — avatar won't persist.", variant: "destructive" });
    }
    setAvatarUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
    setProfileLoading(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      toast({ title: "Password update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    // Sign out first, then we'd need a server-side call to delete the user — 
    // for now sign them out and show a message to contact support
    await signOut();
    toast({
      title: "Deletion requested",
      description: "Contact support@formqo.com to complete account deletion.",
    });
    navigate("/");
  };

  const planInfo = planLabels[plan] ?? planLabels.free;

  const navItems: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "password", label: "Password", icon: KeyRound },
    { key: "plan", label: "Plan & Billing", icon: CreditCard },
    { key: "danger", label: "Danger Zone", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="grid md:grid-cols-[200px_1fr] gap-8">
          {/* Sidebar nav */}
          <nav className="flex flex-row md:flex-col gap-1">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  activeSection === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="space-y-6">
            {/* Profile */}
            {activeSection === "profile" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-base text-foreground mb-1">Profile</h2>
                  <p className="text-sm text-muted-foreground">Update your public profile information.</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display font-bold text-2xl text-muted-foreground">
                          {fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                    </div>
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-background/70 rounded-full flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <Upload size={14} /> Upload photo
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or GIF · max 2MB</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-muted text-muted-foreground text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address.</p>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 disabled:opacity-70"
                >
                  {profileLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save changes
                </button>
              </div>
            )}

            {/* Password */}
            {activeSection === "password" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-base text-foreground mb-1">Change Password</h2>
                  <p className="text-sm text-muted-foreground">Update your account password.</p>
                </div>

                <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-4">
                  <Shield size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You'll remain logged in on this device. Other sessions won't be affected.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 disabled:opacity-70"
                >
                  {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Update password
                </button>
              </div>
            )}

            {/* Plan */}
            {activeSection === "plan" && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-base text-foreground mb-1">Plan & Billing</h2>
                  <p className="text-sm text-muted-foreground">View your current plan and upgrade options.</p>
                </div>

                <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Current plan</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${planInfo.color}`}>
                      {planInfo.label}
                    </span>
                  </div>
                  {plan !== "admin" && (
                    <Link to="/pricing" className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
                      Upgrade <ArrowRight size={13} />
                    </Link>
                  )}
                </div>

                {plan === "free" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <h3 className="font-display font-semibold text-sm text-foreground mb-3">What you'll unlock on Pro</h3>
                    <ul className="space-y-2">
                      {[
                        "Unlimited forms (you have 3 now)",
                        "10,000 responses/month (you have 100)",
                        "AI question generation",
                        "Remove Formqo branding",
                        "Custom domain",
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <Check size={13} className="text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/pricing" className="btn-primary mt-5 inline-flex items-center gap-2 text-sm px-5 py-2.5">
                      See pricing <ArrowRight size={13} />
                    </Link>
                  </div>
                )}

                {plan === "admin" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-3">
                    <Shield size={18} className="text-primary shrink-0" />
                    <div>
                      <p className="font-display font-semibold text-sm text-foreground">Admin · Unlimited access</p>
                      <p className="text-xs text-muted-foreground mt-0.5">All features are unlocked. No plan restrictions apply.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            {activeSection === "danger" && (
              <div className="bg-card rounded-2xl border border-destructive/30 p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-base text-destructive mb-1">Danger Zone</h2>
                  <p className="text-sm text-muted-foreground">Irreversible actions. Proceed with caution.</p>
                </div>

                <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Deleting your account will permanently remove all your forms, responses, and data. This cannot be undone.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2.5 rounded-lg border border-destructive/30 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all"
                  />
                </div>

                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleteLoading}
                  className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete my account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
