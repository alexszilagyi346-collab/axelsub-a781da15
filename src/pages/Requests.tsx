import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnimeRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  title: string;
  message: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Folyamatban", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  approved: { label: "Elfogadva", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  rejected: { label: "Elutasítva", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

const RequestCard = ({
  request,
  isOwn,
  canManage,
  onUpdate,
}: {
  request: AnimeRequest;
  isOwn: boolean;
  canManage: boolean;
  onUpdate: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [adminNote, setAdminNote] = useState(request.admin_note || "");
  const [saving, setSaving] = useState(false);
  const cfg = statusConfig[request.status] || statusConfig.pending;
  const Icon = cfg.icon;

  const handleStatusUpdate = async (newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("anime_requests")
        .update({ status: newStatus, admin_note: adminNote, updated_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;
      toast.success("Kérés frissítve!");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Hiba történt!");
    } finally {
      setSaving(false);
    }
  };

  const handleNoteSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("anime_requests")
        .update({ admin_note: adminNote, updated_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;
      toast.success("Megjegyzés mentve!");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Hiba történt!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-foreground truncate">{request.title}</h3>
              <Badge className={`text-xs border ${cfg.color} flex items-center gap-1`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </Badge>
            </div>
            {isOwn && request.user_email && (
              <p className="text-xs text-muted-foreground">{request.user_email}</p>
            )}
            {canManage && request.user_email && (
              <p className="text-xs text-muted-foreground">{request.user_email}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(request.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3 border-t border-border mt-3">
                {request.message && (
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Üzenet:</p>
                    <p className="text-sm text-foreground">{request.message}</p>
                  </div>
                )}

                {request.admin_note && !canManage && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs text-primary font-medium mb-1">Admin válasz:</p>
                    <p className="text-sm text-foreground">{request.admin_note}</p>
                  </div>
                )}

                {canManage && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Admin megjegyzés</Label>
                      <Textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Válasz a felhasználónak..."
                        className="bg-background text-sm min-h-[70px]"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-400 border-green-500/30 hover:bg-green-500/10 gap-1"
                        disabled={saving}
                        onClick={() => handleStatusUpdate("approved")}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Elfogad
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                        disabled={saving}
                        onClick={() => handleStatusUpdate("rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Elutasít
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10 gap-1"
                        disabled={saving}
                        onClick={() => handleStatusUpdate("pending")}
                      >
                        <Clock className="h-3.5 w-3.5" /> Folyamatban
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={handleNoteSave}
                        className="ml-auto"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Megjegyzés mentése"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const Requests = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const canManage = isAdmin || isModerator;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["anime_requests", canManage],
    queryFn: async () => {
      let query = supabase
        .from("anime_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!canManage) {
        query = query.eq("user_id", user?.id || "");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AnimeRequest[];
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("A cím megadása kötelező!"); return; }
    if (!user) { toast.error("Be kell jelentkezned!"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("anime_requests").insert({
        user_id: user.id,
        user_email: user.email,
        title: title.trim(),
        message: message.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Kérés elküldve!");
      setTitle("");
      setMessage("");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Hiba történt!");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (requests || []).filter((r) => {
    return statusFilter === "all" || r.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              Anime kérések
            </h1>
            <p className="text-muted-foreground">
              {canManage
                ? "Összes felhasználói anime kérés kezelése."
                : "Kérj animéket, amiket szeretnél látni a platformon!"}
            </p>
          </div>

          {/* Request Form */}
          {!canManage && (
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Új anime kérés
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="req-title">Anime neve *</Label>
                  <Input
                    id="req-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="pl. Demon Slayer, Attack on Titan..."
                    className="bg-background"
                    required
                    data-testid="input-request-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="req-message">Megjegyzés (opcionális)</Label>
                  <Textarea
                    id="req-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Miért szeretnéd látni? Van megjegyzésed?"
                    className="bg-background min-h-[80px]"
                    data-testid="textarea-request-message"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2"
                  data-testid="button-submit-request"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Kérés küldése
                </Button>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold text-foreground">
              {canManage ? "Beérkezett kérések" : "Saját kéréseim"}
              {requests && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
              )}
            </h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-background" data-testid="select-status-filter">
                <SelectValue placeholder="Szűrés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes</SelectItem>
                <SelectItem value="pending">Folyamatban</SelectItem>
                <SelectItem value="approved">Elfogadva</SelectItem>
                <SelectItem value="rejected">Elutasítva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-lg">Még nincs kérés.</p>
              {!canManage && (
                <p className="text-muted-foreground text-sm mt-1">
                  Küldj egy kérést fentebb!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isOwn={req.user_id === user?.id}
                  canManage={canManage}
                  onUpdate={refetch}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Requests;
