import { useState, useRef, useEffect } from "react";
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
  BookOpen
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
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setTotalUsers(userCount || 0);

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

      setFormData({ title: "", description: "", genre: "", year: "", is_featured: false, video_url: "", image_url: "" });
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
    setFormData({ title: "", description: "", genre: "", year: "", is_featured: false, video_url: "", image_url: "" });
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
            <TabsList className="mb-6">
              <TabsTrigger value="animes" className="gap-2"><Film className="h-4 w-4" /> Animék</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2"><Shield className="h-4 w-4" /> Jogosultságok</TabsTrigger>
              )}
              <TabsTrigger value="settings" className="gap-2"><BookOpen className="h-4 w-4" /> Beállítások</TabsTrigger>
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

            {/* BEÁLLÍTÁSOK TAB */}
            <TabsContent value="settings">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Oldalbeállítások</h2>
                <p className="text-muted-foreground mt-1">Közösségi linkek és egyéb beállítások</p>
              </div>
              <SocialLinksManager />
            </TabsContent>
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
