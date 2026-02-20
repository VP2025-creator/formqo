import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

interface NavbarProps {
  variant?: "default" | "dashboard";
  userRole?: "user" | "admin";
}

const Navbar = ({ variant = "default", userRole }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  if (variant === "dashboard") {
    return (
      <nav className="h-14 border-b border-border bg-background flex items-center px-6 justify-between">
        <Logo height={22} />
        <div className="flex items-center gap-4">
          {userRole === "admin" && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          )}
          <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isActive("/dashboard") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Dashboard
          </Link>
          <Link to="/settings" className={`text-sm font-medium transition-colors ${isActive("/settings") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
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
          <a href="#integrations" className="nav-link">Integrations</a>
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
          <a href="#integrations" className="nav-link text-base" onClick={() => setMobileOpen(false)}>Integrations</a>
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
