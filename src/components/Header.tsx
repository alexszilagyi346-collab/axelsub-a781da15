import { useState } from "react";
import { Search, User, LogOut, Settings, Menu, X, History, ChevronDown, Newspaper, Facebook, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthModal from "@/components/AuthModal";
import NotificationBell from "@/components/NotificationBell";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Hiba a kijelentkezés során");
    } else {
      toast.success("Sikeres kijelentkezés!");
      navigate("/");
    }
  };

  const openSignIn = () => { setAuthMode("signin"); setShowAuthModal(true); };
  const openSignUp = () => { setAuthMode("signup"); setShowAuthModal(true); };

  const animeLinks = [
    { to: "/browse", label: "Összes", status: "" },
    { to: "/browse?status=ongoing", label: "Aktív", status: "ongoing" },
    { to: "/browse?status=completed", label: "Befejezett", status: "completed" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span
                className="text-2xl font-bold text-primary neon-text transition-all group-hover:tracking-wider"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                AXELSUB
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-primary/10 transition-all duration-200"
              >
                Kezdőlap
              </Link>

              {/* Animék dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200">
                    Animék
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-44 glass border-border/50">
                  {animeLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.to}
                      onClick={() => navigate(link.to)}
                      className="cursor-pointer"
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Hírek */}
              <Link
                to="/news"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
              >
                <span className="flex items-center gap-1.5">
                  <Newspaper className="h-3.5 w-3.5" />
                  Hírek
                </span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Social Links */}
            <div className="flex items-center gap-1">
              {siteSettings?.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg">
                    <Facebook className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {siteSettings?.discord_url && (
                <a href={siteSettings.discord_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg">
                <Search className="h-4 w-4" />
              </Button>

              {user && <NotificationBell />}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 glass border-border/50">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                      {isAdmin && <p className="text-xs text-primary">Admin</p>}
                    </div>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="h-4 w-4 mr-2" /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/history")}>
                      <History className="h-4 w-4 mr-2" /> Előzmények
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Settings className="h-4 w-4 mr-2" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Kijelentkezés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold neon-glow text-sm"
                    onClick={openSignUp}
                  >
                    Sign Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
                    onClick={openSignIn}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground hover:bg-primary/10 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pt-4 pb-2 border-t border-border/30 mt-3 space-y-1">
              <Link
                to="/"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kezdőlap
              </Link>

              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Animék</p>
              {animeLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block py-2 px-5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                to="/news"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hírek
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="block py-2 px-3 rounded-lg text-primary hover:bg-primary/10 transition-all font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
    </>
  );
};

export default Header;
