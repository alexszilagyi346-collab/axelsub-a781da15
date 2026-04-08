import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

// Simple math captcha
const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
};

const AuthModal = ({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) => {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { signIn, signUp } = useAuth();

  const verifyCaptcha = useCallback(() => {
    if (parseInt(captchaInput) === captcha.answer) {
      setCaptchaVerified(true);
      toast.success("Sikeres ellenőrzés!");
    } else {
      toast.error("Hibás válasz, próbáld újra!");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
    }
  }, [captchaInput, captcha.answer]);

  const resetCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setCaptchaVerified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      toast.error("Kérlek, először igazold, hogy nem vagy robot!");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("A jelszavak nem egyeznek!");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      toast.error("A jelszónak legalább 6 karakter hosszúnak kell lennie!");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Ez az email cím már regisztrálva van! Próbálj bejelentkezni.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Sikeres regisztráció! Ellenőrizd az email fiókodat a megerősítő linkért.", { duration: 6000 });
          setMode("signin");
          setConfirmPassword("");
          resetCaptcha();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Hibás email cím vagy jelszó!");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Még nem erősítetted meg az email címedet! Ellenőrizd a postaládádat.", { duration: 6000 });
          } else {
            toast.error(error.message);
          }
        } else {
          if (rememberMe) {
            localStorage.setItem("rememberMe", "true");
          } else {
            localStorage.removeItem("rememberMe");
          }
          toast.success("Sikeres bejelentkezés!");
          onClose();
        }
      }
    } catch (err) {
      toast.error("Hiba történt. Próbáld újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {mode === "signin" ? "Bejelentkezés" : "Regisztráció"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {mode === "signin"
                  ? "Jelentkezz be a fiókodba"
                  : "Hozz létre egy új fiókot"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email cím
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="pelda@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Jelszó
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Nem vagyok robot
                </Label>
                <div className="bg-background border border-border rounded-lg p-4">
                  {captchaVerified ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium">Ellenőrizve!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        Oldd meg a feladatot: <span className="text-foreground font-bold">{captcha.question}</span>
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Válasz"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          className="bg-card border-border flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={verifyCaptcha}
                          disabled={!captchaInput}
                        >
                          Ellenőrzés
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remember Me - only for signin */}
              {mode === "signin" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Bejelentkezve maradok
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={loading || !captchaVerified}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "signin" ? (
                  "Bejelentkezés"
                ) : (
                  "Regisztráció"
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    Nincs még fiókod?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        resetCaptcha();
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Regisztrálj
                    </button>
                  </>
                ) : (
                  <>
                    Már van fiókod?{" "}
                    <button
                      onClick={() => {
                        setMode("signin");
                        resetCaptcha();
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Jelentkezz be
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
