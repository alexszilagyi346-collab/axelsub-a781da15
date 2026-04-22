import { useState, useRef, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Loader2, 
  Trash2,
  Star,
  Edit,
  X,
  List,
  Users,
  Eye,
  Film,
  Shield,
  ShieldCheck,
  ShieldOff,
  Search,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Mail,
  Bot,
  SendHorizonal,
  Sparkles
} from "lucide-react";
import EpisodeManager from "@/components/EpisodeManager";
import SocialLinksManager from "@/components/SocialLinksManager";
import Header from "@/components/Header";
import AnimeSearch from "@/components/AnimeSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
import { useAnimes } from "@/hooks/useAnimes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Anime } from "@/types/anime";

interface UserWithRole {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: string[];
}

const UserManagement = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      toast.error("Adj meg egy email-t a kereséshez!");
      return;
    }
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .ilike("email", `%${searchEmail}%`)
        .limit(10);

      if (error) throw error;

      const enriched: UserWithRole[] = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", p.user_id);
          return {
            ...p,
            roles: (roleData || []).map((r: any) => r.role),
          };
        })
      );
      setUsers(enriched);
      if (enriched.length === 0) toast.info("Nem található felhasználó");
    } catch (e: any) {
      toast.error(e.message || "Hiba a keresésnél");
    } finally {
      setLoading(false);
    }
  };

  const grantRole = async (userId: string, role: "moderator" | "admin") => {
    setActionLoading(userId + role);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
      toast.success(`${role === "moderator" ? "Moderátor" : "Admin"} jog megadva!`);
      setUsers(prev => prev.map(u => u.user_id === userId
        ? { ...u, roles: [...u.roles.filter(r => r !== role), role] }
        : u
      ));
    } catch (e: any) {
      toast.error(e.message || "Hiba a jog megadásánál");
    } finally {
      setActionLoading(null);
    }
  };

  const revokeRole = async (userId: string, role: "moderator" | "admin") => {
    setActionLoading(userId + role + "revoke");
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
      toast.success(`${role === "moderator" ? "Moderátor" : "Admin"} jog elvéve!`);
      setUsers(prev => prev.map(u => u.user_id === userId
        ? { ...u, roles: u.roles.filter(r => r !== role) }
        : u
      ));
    } catch (e: any) {
      toast.error(e.message || "Hiba a jog elvételénél");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Felhasználó jogosultságok kezelése
        </h2>
        <div className="flex gap-2 mb-4">
          <Input
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Keresés email alapján..."
            className="bg-background"
            onKeyDown={(e) => { if (e.key === "Enter") searchUsers(); }}
          />
          <Button variant="secondary" onClick={searchUsers} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {users.length > 0 && (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {users.map((u) => (
              <div key={u.user_id} className="flex items-center gap-4 p-4 bg-background/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{u.email}</p>
                  {u.display_name && <p className="text-xs text-muted-foreground">{u.display_name}</p>}
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {u.roles.length === 0 && (
                      <Badge variant="outline" className="text-xs">Felhasználó</Badge>
                    )}
                    {u.roles.includes("moderator") && (
                      <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Moderátor
                      </Badge>
                    )}
                    {u.roles.includes("admin") && (
                      <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                        <Shield className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!u.roles.includes("moderator") ? (
                    <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 text-xs gap-1"
                      disabled={actionLoading === u.user_id + "moderator"}
                      onClick={() => grantRole(u.user_id, "moderator")}>
                      {actionLoading === u.user_id + "moderator" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                      Mod jog
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1"
                      disabled={actionLoading === u.user_id + "moderatorrevoke"}
                      onClick={() => revokeRole(u.user_id, "moderator")}>
                      {actionLoading === u.user_id + "moderatorrevoke" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                      Mod elvét
                    </Button>
                  )}
                  {!u.roles.includes("admin") ? (
                    <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10 text-xs gap-1"
                      disabled={actionLoading === u.user_id + "admin"}
                      onClick={() => grantRole(u.user_id, "admin")}>
                      {actionLoading === u.user_id + "admin" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                      Admin jog
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1"
                      disabled={actionLoading === u.user_id + "adminrevoke"}
                      onClick={() => revokeRole(u.user_id, "admin")}>
                      {actionLoading === u.user_id + "adminrevoke" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                      Admin elvét
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Email küldés tab ----
const EmailSendTab = () => {
  const { data: animes } = useAnimes();
  const [selectedAnimeId, setSelectedAnimeId] = useState("");
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [loadingEps, setLoadingEps] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notifyAllUsers, setNotifyAllUsers] = useState(false);

  const selectedAnime = animes?.find((a) => a.id === selectedAnimeId);

  useEffect(() => {
    if (!selectedAnimeId) { setEpisodes([]); setSelectedEpisode(null); return; }
    setLoadingEps(true);
    supabase
      .from("episodes")
      .select("id, episode_number, title")
      .eq("anime_id", selectedAnimeId)
      .order("episode_number", { ascending: false })
      .then(({ data }) => {
        setEpisodes(data || []);
        setSelectedEpisode(null);
        setSubject("");
        setBody("");
        setLoadingEps(false);
      });
  }, [selectedAnimeId]);

  useEffect(() => {
    if (!selectedAnime || !selectedEpisode) return;
    const t = selectedAnime.title;
    const ep = selectedEpisode.episode_number;
    setSubject(`🎌 Új epizód érkezett! ${t} – ${ep}. rész`);
    setBody(`Szia!

Izgalmas hír érkezett – a(z) ${t} legújabb, ${ep}. epizódja megérkezett az AxelSub-ra! 🎉

🎬 Mit várj ebben a részben?
Ez az epizód tele van izgalommal, fordulatokkal és olyan pillanatokkal, amiket nem akarsz lemaradni! Magyar felirattal, kiváló minőségben, ahogy megszoktad.

👉 Nézd meg most:
https://axelsub.eu/anime/${selectedAnimeId}

Ha még nem iratkoztál fel a sorozatra, megteheted az anime oldalán, és az összes új részről értesítünk!

Jó nézést! 🍿
AxelSub csapata 🎌`);
  }, [selectedEpisode, selectedAnime]);

  const handleSend = async () => {
    if (!selectedAnime || !selectedEpisode) return toast.error("Válassz animét és epizódot!");
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/episode-notify"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          animeId: selectedAnimeId,
          animeTitle: selectedAnime.title,
          episodeNumber: selectedEpisode.episode_number,
          animeSlug: selectedAnimeId,
          notifyAllUsers,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        console.error("[episode-notify] szerver hiba – nyers válasz:", raw);
        throw new Error(`Szerver hiba (${res.status}): ${raw.slice(0, 120)}`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.sent === 0) {
        toast.warning(data.message || data.error || `Nincs címzett (${notifyAllUsers ? "regisztrált felhasználó" : "feliratkozó"})!`);
      } else {
        toast.success(`✅ Email elküldve ${data.sent}/${data.total ?? data.sent} ${notifyAllUsers ? "felhasználónak" : "feliratkozónak"}!`);
      }
    } catch (err: any) {
      console.error("[episode-notify] hiba:", err);
      toast.error(`Hiba: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> Email küldés
        </h2>
        <p className="text-muted-foreground mt-1">
          Válassz animét és epizódot — a bot automatikusan generál promo szöveget, amit szerkeszthetsz és elküldhetsz a feliratkozóknak.
        </p>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-primary">
        <Sparkles className="h-4 w-4 shrink-0" />
        {notifyAllUsers
          ? "Az email MINDEN regisztrált AxelSub-felhasználónak ki fog menni."
          : "Az email csak azoknak megy ki, akik feliratkoztak erre az animére az oldalon."}
      </div>

      <label className="flex items-center gap-3 bg-background/40 border border-border/50 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition">
        <input
          type="checkbox"
          checked={notifyAllUsers}
          onChange={(e) => setNotifyAllUsers(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">📣 Küldés minden regisztrált felhasználónak</div>
          <div className="text-xs text-muted-foreground">Bekapcsolva nem csak a feliratkozók, hanem minden AxelSub-tag megkapja az értesítőt.</div>
        </div>
      </label>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Anime kiválasztása</Label>
          <select
            value={selectedAnimeId}
            onChange={(e) => setSelectedAnimeId(e.target.value)}
            className="w-full rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="">— Válassz animét —</option>
            {animes?.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Epizód kiválasztása</Label>
          {loadingEps ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Epizódok betöltése...
            </div>
          ) : (
            <select
              value={selectedEpisode?.id || ""}
              onChange={(e) => setSelectedEpisode(episodes.find((ep) => ep.id === e.target.value) || null)}
              disabled={!selectedAnimeId || episodes.length === 0}
              className="w-full rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
            >
              <option value="">— Válassz epizódot —</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.episode_number}. rész{ep.title ? ` – ${ep.title}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedEpisode && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Email tárgy</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="glass border-border/50"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm text-muted-foreground">Email szövege</Label>
              <span className="text-xs text-primary flex items-center gap-1">
                <Bot className="h-3 w-3" /> Bot által generálva – szerkeszthető
              </span>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="glass border-border/50 font-mono text-sm resize-none"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-primary hover:bg-primary/90 gap-2 neon-glow"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            {sending ? "Küldés folyamatban..." : `Email küldése ${notifyAllUsers ? "MINDEN regisztrált felhasználónak" : "minden feliratkozónak"} – ${selectedAnime?.title} ${selectedEpisode.episode_number}. rész`}
          </Button>
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isModerator, loading: modLoading } = useIsModerator();
  const canAccess = isAdmin || isModerator;
  const { data: animes, isLoading: animesLoading, refetch } = useAnimes();
  
  const [showForm, setShowForm] = useState(false);
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    year: "",
    status: "ongoing",
    is_featured: false,
    video_url: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [episodeManagerAnime, setEpisodeManagerAnime] = useState<Anime | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeViewers, setActiveViewers] = useState(0);
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canAccess) return;
    const fetchStats = async () => {
      // Try client-side count first
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      let total = userCount || 0;

      // If client-side returns 0 (RLS may hide rows), ask the server using service key
      if (total === 0) {
        try {
          const r = await fetch(apiUrl("/api/user-stats"));
          if (r.ok) {
            const data = await r.json();
            if (data.ok && typeof data.total === "number") total = data.total;
          }
        } catch {
          // ignore – we'll show whatever client returned
        }
      }
      setTotalUsers(total);

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: viewerCount } = await supabase
        .from("watch_history")
        .select("user_id", { count: "exact", head: true })
        .gte("last_watched_at", yesterday);
      setActiveViewers(viewerCount || 0);
    };
    fetchStats();
  }, [canAccess]);

  if (authLoading || adminLoading || modLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Skeleton className="w-48 h-8 mb-8" />
            <Skeleton className="w-full h-64" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Hozzáférés megtagadva</h1>
            <p className="text-muted-foreground">Nincs admin/moderátor jogosultságod.</p>
          </div>
        </main>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from("animek").upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("animek").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error("A cím megadása kötelező!"); return; }
    setUploading(true);
    try {
      let imageUrl = formData.image_url || editingAnime?.image_url || null;
      if (imageFile) imageUrl = await uploadFile(imageFile, "images");

      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        genre: formData.genre.trim() || null,
        is_featured: formData.is_featured,
        image_url: imageUrl,
        video_url: formData.video_url.trim() || null,
        year: formData.year ? parseInt(formData.year) : null,
        status: formData.status || "ongoing",
      };

      if (editingAnime) {
        const { error } = await supabase.from("animes").update(payload).eq("id", editingAnime.id);
        if (error) throw error;
        toast.success("Anime sikeresen frissítve!");
      } else {
        const { error } = await supabase.from("animes").insert(payload);
        if (error) throw error;
        toast.success("Anime sikeresen hozzáadva!");
      }

      setFormData({ title: "", description: "", genre: "", year: "", status: "ongoing", is_featured: false, video_url: "", image_url: "" });
      setImageFile(null);
      setImagePreview(null);
      setEditingAnime(null);
      setShowForm(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Hiba történt!");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (anime: Anime) => {
    setEditingAnime(anime);
    setFormData({
      title: anime.title,
      description: anime.description || "",
      genre: anime.genre || "",
      year: anime.year ? String(anime.year) : "",
      status: anime.status || "ongoing",
      is_featured: anime.is_featured || false,
      video_url: anime.video_url || "",
      image_url: anime.image_url || "",
    });
    setImagePreview(anime.image_url);
    setShowForm(true);
  };

  const handleDelete = async (anime: Anime) => {
    if (!confirm(`Biztosan törölni szeretnéd: "${anime.title}"?`)) return;
    try {
      const { error } = await supabase.from("animes").delete().eq("id", anime.id);
      if (error) throw error;
      toast.success("Anime törölve!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Hiba a törlés során!");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", genre: "", year: "", status: "ongoing", is_featured: false, video_url: "", image_url: "" });
    setImageFile(null);
    setImagePreview(null);
    setEditingAnime(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Regisztrált felhasználó</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><Eye className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeViewers}</p>
                <p className="text-sm text-muted-foreground">Aktív néző (24h)</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><Film className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{animes?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Összes anime</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="animes" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="animes" className="gap-2"><Film className="h-4 w-4" /> Animék</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2"><Shield className="h-4 w-4" /> Jogosultságok</TabsTrigger>
              )}
              <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email küldés</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2"><BookOpen className="h-4 w-4" /> Beállítások</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="secrets" className="gap-2"><Lock className="h-4 w-4" /> Titkok</TabsTrigger>
              )}
            </TabsList>

            {/* ANIMÉK TAB */}
            <TabsContent value="animes">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Animék kezelése</h2>
                  <p className="text-muted-foreground mt-1">Animék hozzáadása, szerkesztése, törlése</p>
                </div>
                {!showForm && (
                  <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90 gap-2">
                    <Plus className="h-5 w-5" /> Új anime
                  </Button>
                )}
              </div>

              {showForm && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">
                      {editingAnime ? "Anime szerkesztése" : "Új anime hozzáadása"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-5 w-5" /></Button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Keresés (MAL / AniList / Kitsu)</Label>
                      <AnimeSearch
                        onSelect={(data) => {
                          setFormData(f => ({
                            ...f,
                            title: data.title,
                            description: data.description,
                            genre: data.genre,
                            image_url: data.image_url,
                            year: data.year ? String(data.year) : f.year,
                          }));
                          setImagePreview(data.image_url);
                        }}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Cím *</Label>
                          <Input id="title" value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Anime címe" className="bg-background" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="genre">Műfaj</Label>
                          <Input id="genre" value={formData.genre}
                            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                            placeholder="pl. Akció, Kaland" className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">Év</Label>
                          <Input id="year" type="number" value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                            placeholder="2024" className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label>Státusz</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ongoing">Vetítés alatt</SelectItem>
                              <SelectItem value="completed">Befejezett</SelectItem>
                              <SelectItem value="upcoming">Hamarosan</SelectItem>
                              <SelectItem value="hiatus">Szünetel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Leírás</Label>
                          <Textarea id="description" value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Anime leírása..." className="bg-background min-h-[120px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch id="featured" checked={formData.is_featured}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })} />
                          <Label htmlFor="featured" className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" /> Kiemelt anime
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Borítókép</Label>
                          <div onClick={() => imageInputRef.current?.click()}
                            className="border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors text-center">
                            {imagePreview ? (
                              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ImageIcon className="h-10 w-10" />
                                <span>Kattints a kép feltöltéséhez</span>
                              </div>
                            )}
                          </div>
                          <input ref={imageInputRef} type="file" accept="image/*"
                            onChange={handleImageSelect} className="hidden" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="video_url">Videó URL</Label>
                          <Input id="video_url" type="url" value={formData.video_url}
                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                            placeholder="https://example.com/video.mp4" className="bg-background" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" className="bg-primary hover:bg-primary/90 gap-2" disabled={uploading}>
                        {uploading ? <><Loader2 className="h-5 w-5 animate-spin" />Feltöltés...</> : <><Upload className="h-5 w-5" />{editingAnime ? "Mentés" : "Hozzáadás"}</>}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm}>Mégse</Button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Animék ({animes?.length || 0})</h2>
                </div>
                {animesLoading ? (
                  <div className="p-4 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : animes?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Még nincs anime hozzáadva.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {animes?.map((anime) => (
                      <motion.div key={anime.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {anime.image_url ? (
                            <img src={anime.image_url} alt={anime.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{anime.title}</h3>
                            {anime.is_featured && <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{anime.genre || "Nincs műfaj"}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {anime.year && <span>{anime.year}</span>}
                            {anime.video_url && <span className="flex items-center gap-1"><Video className="h-3 w-3" />Videó</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEpisodeManagerAnime(anime)}
                            className="text-muted-foreground hover:text-foreground" title="Epizódok kezelése">
                            <List className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(anime)}
                            className="text-muted-foreground hover:text-foreground">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(anime)}
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* JOGOSULTSÁGOK TAB – csak admin */}
            {isAdmin && (
              <TabsContent value="users">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Felhasználók & Jogosultságok</h2>
                  <p className="text-muted-foreground mt-1">Adj moderátor vagy admin jogot más felhasználóknak</p>
                </div>
                <UserManagement />
              </TabsContent>
            )}

            {/* EMAIL KÜLDÉS TAB */}
            <TabsContent value="email">
              <EmailSendTab />
            </TabsContent>

            {/* BEÁLLÍTÁSOK TAB */}
            <TabsContent value="settings">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Oldalbeállítások</h2>
                <p className="text-muted-foreground mt-1">Közösségi linkek és egyéb beállítások</p>
              </div>
              <SocialLinksManager />
            </TabsContent>

            {/* TITKOK TAB – csak admin */}
            {isAdmin && (
              <TabsContent value="secrets">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-6 w-6 text-primary" /> Titkok & API kulcsok
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    A szerver által igényelt környezeti változók. Ezeket a Replit Secrets fülön kell beállítani.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Supabase szekció */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Supabase
                    </h3>
                    <div className="space-y-2">
                      {[
                        { key: "VITE_SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL },
                        { key: "VITE_SUPABASE_PUBLISHABLE_KEY", value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
                        { key: "VITE_SUPABASE_PROJECT_ID", value: import.meta.env.VITE_SUPABASE_PROJECT_ID },
                      ].map(({ key, value }) => (
                        <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center gap-3">
                            {value ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            <code className="text-sm text-muted-foreground font-mono">{key}</code>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${value ? "bg-green-400/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                            {value ? "Beállítva" : "Hiányzik"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email szekció */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Brevo email (szerver)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">Ezek szerver oldali változók – frontendről nem ellenőrizhetők</p>
                    <div className="space-y-2">
                      {["BREVO_API_KEY", "BREVO_SENDER_EMAIL"].map((key) => (
                        <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center gap-3">
                            <Lock className="h-4 w-4 text-yellow-400 shrink-0" />
                            <code className="text-sm text-muted-foreground font-mono">{key}</code>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">
                            Szerver
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Replit link */}
                  <a
                    href="https://replit.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Replit Secrets beállítása</p>
                      <p className="text-xs text-muted-foreground">Kattints ide → bal oldali 🔒 Secrets fül</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  {/* ZIP letöltés */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                      Projekt letöltése
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Az egész alkalmazás forráskódját ZIP fájlban töltheted le (node_modules nélkül).
                    </p>
                    <a
                      href="/api/download-zip"
                      download="axelsub.zip"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all neon-glow"
                    >
                      ⬇️ Letöltés ZIP-ben
                    </a>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <AnimatePresence>
        {episodeManagerAnime && (
          <EpisodeManager
            animeId={episodeManagerAnime.id}
            animeTitle={episodeManagerAnime.title}
            onClose={() => setEpisodeManagerAnime(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
