import { useState } from "react";
import { Search, User, LogOut, Settings, Menu, X } from "lucide-react";
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
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { toast } from "sonner";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
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

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuthModal(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">AXELSUB</span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Kezdőlap
              </Link>
              <Link 
                to="/browse" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Böngészés
              </Link>
              <Link 
                to="/public" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Publikus
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Search className="h-5 w-5" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </p>
                      {isAdmin && (
                        <p className="text-xs text-primary">Admin</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Kijelentkezés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    onClick={openSignUp}
                  >
                    Sign Up
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={openSignIn}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pt-4 pb-2 border-t border-border mt-4 space-y-2">
              <Link 
                to="/" 
                className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kezdőlap
              </Link>
              <Link 
                to="/browse" 
                className="block py-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Böngészés
              </Link>
              <Link 
                to="/public" 
                className="block py-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Publikus
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="block py-2 text-primary hover:text-primary/80 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </>
  );
};

export default Header;
