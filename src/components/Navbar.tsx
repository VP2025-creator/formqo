import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown, Settings, LayoutDashboard, LogOut, ShieldCheck, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

interface NavbarProps {
  variant?: "default" | "dashboard";
  userRole?: "user" | "admin";
}

// ── Dashboard user dropdown ────────────────────────────────────────────────
function UserMenu({ userRole, onSignOut }: { userRole?: string; onSignOut: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
        }
      });
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials =
    fullName?.trim()
      ? fullName.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
      : user?.email?.[0]?.toUpperCase() ?? "?";

  const displayName = fullName?.trim() || user?.email?.split("@")[0] || "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-muted-foreground">{initials}</span>
          )}
        </div>
        <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:block">
          {displayName}
        </span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border rounded-xl shadow-lg py-1.5 z-50">
          {/* Identity header */}
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
          </div>

          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Home size={14} className="text-muted-foreground" /> Homepage
          </Link>

          {userRole === "admin" && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <ShieldCheck size={14} className="text-primary" /> Admin panel
            </Link>
          )}

          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <LayoutDashboard size={14} className="text-muted-foreground" /> Dashboard
          </Link>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings size={14} className="text-muted-foreground" /> Settings
          </Link>

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────
const Navbar = ({ variant = "default", userRole }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (variant === "dashboard") {
    return (
      <nav className="h-14 border-b border-border bg-background flex items-center px-6 justify-between">
        <Logo height={22} to="/dashboard" />
        <UserMenu userRole={userRole} onSignOut={handleSignOut} />
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Logo height={26} />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="nav-link">Features</a>
          <Link to="/templates" className="nav-link">Templates</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/login" className="nav-link">Log in</Link>
          <Link
            to="/signup"
            className="btn-primary text-sm px-4 py-2 rounded-md"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-6 flex flex-col gap-4">
          <a href="#features" className="nav-link text-base" onClick={() => setMobileOpen(false)}>Features</a>
          <Link to="/templates" className="nav-link text-base" onClick={() => setMobileOpen(false)}>Templates</Link>
          <Link to="/pricing" className="nav-link text-base" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link to="/login" className="nav-link text-base" onClick={() => setMobileOpen(false)}>Log in</Link>
          <Link
            to="/signup"
            className="btn-primary text-center"
            onClick={() => setMobileOpen(false)}
          >
            Get started free
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
