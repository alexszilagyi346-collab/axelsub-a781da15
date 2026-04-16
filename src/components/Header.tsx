import { useState } from "react";
import { Search, User, LogOut, Settings, Menu, X, History, ChevronDown, Newspaper, Facebook, MessageCircle, BookOpen, MessageSquare, ShoppingBag } from "lucide-react";
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
import { useIsModerator } from "@/hooks/useIsModerator";
import { useIsShopManager } from "@/hooks/useIsShopManager";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const { isShopManager } = useIsShopManager();
  const canAccessAdmin = isAdmin || isModerator;
  const canAccessShopAdmin = isAdmin || isModerator || isShopManager;
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

              {/* Manga */}
              <Link
                to="/manga"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Manga
                </span>
              </Link>

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

              {/* Kérések */}
              <Link
                to="/requests"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
              >
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Kérések
                </span>
              </Link>

              {/* Bolt */}
              <Link
                to="/shop"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
              >
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Bolt
                </span>
              </Link>

              {canAccessShopAdmin && !canAccessAdmin && (
                <Link
                  to="/shop-admin"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                >
                  Bolt Panel
                </Link>
              )}

              {canAccessAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                >
                  {isAdmin ? "Admin" : "Moderátor"}
                </Link>
              )}
            </nav>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {siteSettings?.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#1877F2]/15 text-[#1877F2] hover:bg-[#1877F2]/25 hover:scale-110 transition-all duration-200">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {siteSettings?.discord_url && (
                <a href={siteSettings.discord_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#5865F2]/15 text-[#5865F2] hover:bg-[#5865F2]/25 hover:scale-110 transition-all duration-200">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
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
                    {canAccessShopAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/shop-admin")}>
                        <ShoppingBag className="h-4 w-4 mr-2" /> Bolt Panel
                      </DropdownMenuItem>
                    )}
                    {canAccessAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Settings className="h-4 w-4 mr-2" /> {isAdmin ? "Admin Panel" : "Moderátor Panel"}
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
                to="/manga"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Manga
              </Link>

              <Link
                to="/news"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hírek
              </Link>

              <Link
                to="/requests"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kérések
              </Link>

              <Link
                to="/shop"
                className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Bolt
                </span>
              </Link>

              {canAccessShopAdmin && (
                <Link
                  to="/shop-admin"
                  className="block py-2 px-3 rounded-lg text-primary hover:bg-primary/10 transition-all font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Bolt Panel
                </Link>
              )}

              {canAccessAdmin && (
                <Link
                  to="/admin"
                  className="block py-2 px-3 rounded-lg text-primary hover:bg-primary/10 transition-all font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {isAdmin ? "Admin" : "Moderátor"}
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
