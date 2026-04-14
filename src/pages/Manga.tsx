import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Search, Plus, Trash2, Edit, Star, Loader2, X, Upload, Image as ImageIcon, Play } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Manga {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  genre: string | null;
  author: string | null;
  status: string | null;
  chapters_count: number | null;
  year: number | null;
  is_featured: boolean | null;
  read_url: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  ongoing: "Folyamatban",
  completed: "Befejezett",
  hiatus: "Szünetel",
};

const searchAniListManga = async (query: string) => {
  const gql = `
    query ($search: String) {
      Page(perPage: 6) {
        media(search: $search, type: MANGA) {
          id
          title { romaji english }
          description(asHtml: false)
          coverImage { large }
          genres
          startDate { year }
          staff { edges { node { name { full } } role } }
        }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
  });
  const data = await res.json();
  return (data.data?.Page?.media || []).map((m: any) => {
    const authorEdge = m.staff?.edges?.find((e: any) => e.role === "Story" || e.role === "Art" || e.role === "Story & Art");
    return {
      id: String(m.id),
      title: m.title?.english || m.title?.romaji || "",
      synopsis: (m.description || "").replace(/<[^>]*>/g, "").substring(0, 500),
      imageUrl: m.coverImage?.large || "",
      genres: (m.genres || []).join(", "),
      year: m.startDate?.year || null,
      author: authorEdge?.node?.name?.full || "",
    };
  });
};

const MangaForm = ({ manga, onClose }: { manga?: Manga | null; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: manga?.title || "",
    description: manga?.description || "",
    image_url: manga?.image_url || "",
    genre: manga?.genre || "",
    author: manga?.author || "",
    status: manga?.status || "ongoing",
    year: manga?.year ? String(manga.year) : "",
    is_featured: manga?.is_featured || false,
    read_url: manga?.read_url || "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(manga?.image_url || null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadImageFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `manga-covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from("animek").upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("animek").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchAniListManga(searchQuery);
      setSearchResults(results);
    } catch {
      toast.error("AniList keresési hiba");
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = (r: any) => {
    setForm(f => ({ ...f, title: r.title, description: r.synopsis, image_url: r.imageUrl, genre: r.genres, year: r.year ? String(r.year) : "", author: r.author || "" }));
    setImagePreview(r.imageUrl || null);
    setImageFile(null);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("A cím megadása kötelező!"); return; }
    setSaving(true);
    try {
      let finalImageUrl = form.image_url.trim() || null;
      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile);
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: finalImageUrl,
        genre: form.genre.trim() || null,
        author: form.author.trim() || null,
        status: form.status,
        year: form.year ? parseInt(form.year) : null,
        is_featured: form.is_featured,
        read_url: form.read_url.trim() || null,
      };
      if (manga) {
        const { error } = await supabase.from("mangas").update(payload).eq("id", manga.id);
        if (error) throw error;
        toast.success("Manga frissítve!");
      } else {
        const { error } = await supabase.from("mangas").insert(payload);
        if (error) throw error;
        toast.success("Manga hozzáadva!");
      }
      queryClient.invalidateQueries({ queryKey: ["mangas"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Hiba történt!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">{manga ? "Manga szerkesztése" : "Új manga hozzáadása"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Keresés AniList-en</Label>
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Keresés..." className="bg-background"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }} />
            <Button type="button" variant="secondary" onClick={handleSearch} disabled={searching} className="shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="bg-background border border-border rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map(r => (
                <button key={r.id} type="button" onClick={() => handlePickResult(r)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0">
                  {r.imageUrl && <img src={r.imageUrl} alt={r.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.genres}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cím *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Manga címe" className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Szerző</Label>
            <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Mangaka neve" className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Műfaj</Label>
            <Input value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="Akció, Fantázia..." className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Státusz</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ongoing">Folyamatban</SelectItem>
                <SelectItem value="completed">Befejezett</SelectItem>
                <SelectItem value="hiatus">Szünetel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Év</Label>
            <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" className="bg-background" type="number" />
          </div>
          <div className="space-y-2">
            <Label>Borítókép</Label>
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary transition-colors text-center"
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-2">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Kattints a kép feltöltéséhez</span>
                </div>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileSelect}
              className="hidden"
            />
            {imageFile && (
              <p className="text-xs text-primary">Kiválasztva: {imageFile.name}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">vagy URL</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Input
              value={form.image_url}
              onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); if (e.target.value) { setImagePreview(e.target.value); setImageFile(null); } }}
              placeholder="https://..."
              className="bg-background text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Olvasási link</Label>
            <Input value={form.read_url} onChange={e => setForm(f => ({ ...f, read_url: e.target.value }))} placeholder="https://..." className="bg-background" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Leírás</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Manga leírása..." className="bg-background min-h-[100px]" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
            <Label>Kiemelt manga</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {manga ? "Mentés" : "Hozzáadás"}
          </Button>
          <Button variant="outline" onClick={onClose}>Mégse</Button>
        </div>
      </div>
    </div>
  );
};

const Manga = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const canManage = isAdmin || isModerator;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingManga, setEditingManga] = useState<Manga | null>(null);

  const { data: mangas, isLoading } = useQuery({
    queryKey: ["mangas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mangas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Manga[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mangas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mangas"] });
      toast.success("Manga törölve!");
    },
  });

  const filtered = (mangas || []).filter(m => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.author || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                Manga
              </h1>
              <p className="text-muted-foreground">Magyar feliratú mangák egy helyen.</p>
            </div>
            {canManage && !showForm && !editingManga && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Új manga
              </Button>
            )}
          </div>

          {(showForm || editingManga) && (
            <MangaForm manga={editingManga} onClose={() => { setShowForm(false); setEditingManga(null); }} />
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés cím vagy szerző szerint..." className="pl-9 bg-background" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-background"><SelectValue placeholder="Státusz" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes</SelectItem>
                <SelectItem value="ongoing">Folyamatban</SelectItem>
                <SelectItem value="completed">Befejezett</SelectItem>
                <SelectItem value="hiatus">Szünetel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-lg">Még nincs manga hozzáadva.</p>
              {canManage && <p className="text-muted-foreground text-sm mt-1">Adj hozzá az "Új manga" gombbal!</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((manga, i) => (
                <motion.div key={manga.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                  <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                    {manga.image_url ? (
                      <img src={manga.image_url} alt={manga.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {manga.is_featured && (
                      <div className="absolute top-2 left-2">
                        <Star className="h-4 w-4 text-primary fill-primary drop-shadow" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
                      <Link to={`/manga/${manga.id}`}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                        <Play className="h-3.5 w-3.5" /> Olvasás
                      </Link>
                      {canManage && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingManga(manga); setShowForm(false); }}
                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                            <Edit className="h-3.5 w-3.5 text-white" />
                          </button>
                          <button onClick={() => { if (confirm(`Törlöd: "${manga.title}"?`)) deleteMutation.mutate(manga.id); }}
                            className="p-1.5 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <Link to={`/manga/${manga.id}`}>
                      <h3 className="font-semibold text-foreground text-sm truncate leading-tight hover:text-primary transition-colors">{manga.title}</h3>
                    </Link>
                    {manga.author && <p className="text-xs text-muted-foreground truncate mt-0.5">{manga.author}</p>}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {manga.status && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{statusLabels[manga.status] || manga.status}</Badge>
                      )}
                      {manga.year && <span className="text-xs text-muted-foreground">{manga.year}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Manga;
