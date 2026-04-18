import { Link, useLocation } from "react-router-dom";
import { Home, Tv2, BookOpen, ShoppingBag, Menu, X, Newspaper, MessageSquare, History, User, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
import { useIsShopManager } from "@/hooks/useIsShopManager";
import NotificationBell from "@/components/NotificationBell";
import AuthModal from "@/components/AuthModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const { isShopManager } = useIsShopManager();
  const canAccessAdmin = isAdmin || isModerator;
  const canAccessShopAdmin = isAdmin || isModerator || isShopManager;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    const { error } = await signOut();
    if (error) {
      toast.error("Hiba a kijelentkezés során");
    } else {
      toast.success("Sikeres kijelentkezés!");
      navigate("/");
    }
  };

  const navItems = [
    { to: "/", icon: Home, label: "Kezdőlap" },
    { to: "/browse", icon: Tv2, label: "Animék" },
    { to: "/manga", icon: BookOpen, label: "Manga" },
    { to: "/shop", icon: ShoppingBag, label: "Bolt" },
  ];

  return (
    <>
      {/* Overlay when menu is open */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-up menu panel */}
      {menuOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 z-50 mx-3 mb-1 glass border border-border/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="p-4 space-y-1">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2 border-b border-border/30 pb-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  {isAdmin && <p className="text-xs text-primary">Admin</p>}
                  {isModerator && !isAdmin && <p className="text-xs text-yellow-400">Moderátor</p>}
                </div>
                <NotificationBell />
              </div>
            )}

            <Link to="/news" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
              <Newspaper className="h-4 w-4" /> Hírek
            </Link>

            <Link to="/requests" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
              <MessageSquare className="h-4 w-4" /> Kérések
            </Link>

            {user && (
              <Link to="/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
                <User className="h-4 w-4" /> Profil
              </Link>
            )}

            {user && (
              <Link to="/history" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
                <History className="h-4 w-4" /> Előzmények
              </Link>
            )}

            {canAccessShopAdmin && (
              <Link to="/shop-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all">
                <ShoppingBag className="h-4 w-4" /> Bolt Panel
              </Link>
            )}

            {canAccessAdmin && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all">
                <Settings className="h-4 w-4" /> {isAdmin ? "Admin Panel" : "Moderátor Panel"}
              </Link>
            )}

            <div className="border-t border-border/30 mt-2 pt-2">
              {user ? (
                <button onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                  <LogOut className="h-4 w-4" /> Kijelentkezés
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAuthMode("signin"); setShowAuthModal(true); setMenuOpen(false); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border/50 text-foreground hover:border-primary/50 transition-all">
                    Bejelentkezés
                  </button>
                  <button
                    onClick={() => { setAuthMode("signup"); setShowAuthModal(true); setMenuOpen(false); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all neon-glow">
                    Regisztráció
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${active ? "bg-primary/15" : ""}`}>
                  <Icon className={`h-5 w-5 transition-all ${active ? "stroke-[2.5]" : ""}`} />
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More / Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              menuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`relative p-1.5 rounded-xl transition-all ${menuOpen ? "bg-primary/15" : ""}`}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </div>
            <span className="text-[10px] font-medium leading-none">Több</span>
          </button>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
    </>
  );
};

export default MobileBottomNav;
