import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ArrowLeft, Plus, Trash2, Edit, Loader2, X,
  ChevronDown, ChevronUp, List, Play
} from "lucide-react";
import Header from "@/components/Header";
import MangaReader from "@/components/MangaReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
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
}

interface Chapter {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string | null;
  page_urls: string[];
  created_at: string;
}

const statusLabels: Record<string, string> = {
  ongoing: "Folyamatban",
  completed: "Befejezett",
  hiatus: "Szünetel",
};

/* ─── Chapter Form ─── */
const ChapterForm = ({ mangaId, chapter, onClose }: { mangaId: string; chapter?: Chapter | null; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [chapterNumber, setChapterNumber] = useState(chapter ? String(chapter.chapter_number) : "");
  const [title, setTitle] = useState(chapter?.title || "");
  const [pagesText, setPagesText] = useState(chapter ? chapter.page_urls.join("\n") : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(chapterNumber);
    if (!chapterNumber || isNaN(num)) { toast.error("Adj meg egy fejezet számot!"); return; }
    const urls = pagesText.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) { toast.error("Legalább egy oldal URL szükséges!"); return; }

    setSaving(true);
    try {
      const payload = {
        manga_id: mangaId,
        chapter_number: num,
        title: title.trim() || null,
        page_urls: urls,
      };
      if (chapter) {
        const { error } = await supabase.from("manga_chapters").update(payload).eq("id", chapter.id);
        if (error) throw error;
        toast.success("Fejezet frissítve!");
      } else {
        const { error } = await supabase.from("manga_chapters").insert(payload);
        if (error) throw error;
        toast.success("Fejezet hozzáadva!");
      }
      queryClient.invalidateQueries({ queryKey: ["manga-chapters", mangaId] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Hiba történt!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">{chapter ? "Fejezet szerkesztése" : "Új fejezet"}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Fejezet száma *</Label>
            <Input value={chapterNumber} onChange={e => setChapterNumber(e.target.value)}
              placeholder="1 vagy 1.5" type="number" step="0.1" min="0" className="bg-background" />
          </div>
          <div className="space-y-1">
            <Label>Cím (opcionális)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Pl.: Az első találkozás" className="bg-background" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Oldalak URL-jei (soronként egy) *</Label>
          <Textarea
            value={pagesText}
            onChange={e => setPagesText(e.target.value)}
            placeholder={"https://cdn.example.com/manga/ch1/01.jpg\nhttps://cdn.example.com/manga/ch1/02.jpg\n..."}
            className="bg-background min-h-[160px] font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {pagesText.split("\n").filter(u => u.trim()).length} oldal megadva
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {chapter ? "Mentés" : "Hozzáadás"}
          </Button>
          <Button variant="outline" onClick={onClose}>Mégse</Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const canManage = isAdmin || isModerator;
  const queryClient = useQueryClient();

  const [readerChapterId, setReaderChapterId] = useState<string | null>(null);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [expanded, setExpanded] = useState(true);

  const { data: manga, isLoading: mangaLoading } = useQuery({
    queryKey: ["manga", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mangas").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Manga;
    },
    enabled: !!id,
  });

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ["manga-chapters", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manga_chapters")
        .select("*")
        .eq("manga_id", id!)
        .order("chapter_number", { ascending: true });
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!id,
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      const { error } = await supabase.from("manga_chapters").delete().eq("id", chapterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manga-chapters", id] });
      toast.success("Fejezet törölve!");
    },
  });

  if (mangaLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid md:grid-cols-3 gap-8">
            <Skeleton className="aspect-[2/3] rounded-xl" />
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 container mx-auto px-4 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">Manga nem található.</p>
          <Link to="/manga"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Vissza</Button></Link>
        </main>
      </div>
    );
  }

  const sortedChapters = [...(chapters || [])].sort((a, b) => a.chapter_number - b.chapter_number);

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            {/* Back */}
            <Link to="/manga">
              <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Manga lista
              </Button>
            </Link>

            {/* Hero */}
            <div className="grid md:grid-cols-[280px_1fr] gap-8 mb-10">
              <div className="relative">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-2xl">
                  {manga.image_url ? (
                    <img src={manga.image_url} alt={manga.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-start gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-1">{manga.title}</h1>
                  {manga.author && <p className="text-muted-foreground">{manga.author}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {manga.status && (
                    <Badge variant="secondary">{statusLabels[manga.status] || manga.status}</Badge>
                  )}
                  {manga.year && <Badge variant="outline">{manga.year}</Badge>}
                  {manga.genre && manga.genre.split(",").map(g => (
                    <Badge key={g.trim()} variant="outline" className="text-xs">{g.trim()}</Badge>
                  ))}
                </div>

                {manga.description && (
                  <p className="text-muted-foreground leading-relaxed text-sm">{manga.description}</p>
                )}

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <List className="h-4 w-4" />
                    {chapters?.length || 0} fejezet
                  </span>
                </div>

                {sortedChapters.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    <Button onClick={() => setReaderChapterId(sortedChapters[0].id)} className="gap-2">
                      <Play className="h-4 w-4" /> Olvasás kezdése
                    </Button>
                    <Button variant="outline" onClick={() => setReaderChapterId(sortedChapters[sortedChapters.length - 1].id)} className="gap-2">
                      Utolsó fejezet
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Chapters section */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 bg-card cursor-pointer"
                onClick={() => setExpanded(e => !e)}
              >
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  Fejezetek ({sortedChapters.length})
                </h2>
                <div className="flex items-center gap-2">
                  {canManage && !showChapterForm && !editingChapter && (
                    <Button size="sm" variant="secondary" className="gap-1.5 z-10"
                      onClick={e => { e.stopPropagation(); setShowChapterForm(true); setEditingChapter(null); }}>
                      <Plus className="h-3.5 w-3.5" /> Fejezet
                    </Button>
                  )}
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3 border-t border-border">
                      {(showChapterForm || editingChapter) && (
                        <ChapterForm
                          mangaId={manga.id}
                          chapter={editingChapter}
                          onClose={() => { setShowChapterForm(false); setEditingChapter(null); }}
                        />
                      )}

                      {chaptersLoading ? (
                        <div className="space-y-2">
                          {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                        </div>
                      ) : sortedChapters.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Még nincs fejezet hozzáadva.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {sortedChapters.map(ch => (
                            <motion.div
                              key={ch.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                            >
                              <button
                                onClick={() => setReaderChapterId(ch.id)}
                                className="flex-1 flex items-center gap-3 text-left"
                              >
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary font-bold text-sm">{ch.chapter_number}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground text-sm">
                                    {ch.chapter_number}. fejezet
                                    {ch.title && <span className="text-muted-foreground font-normal"> – {ch.title}</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{ch.page_urls.length} oldal</p>
                                </div>
                              </button>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" className="gap-1.5 text-primary h-8"
                                  onClick={() => setReaderChapterId(ch.id)}>
                                  <Play className="h-3.5 w-3.5" /> Olvasás
                                </Button>
                                {canManage && (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8"
                                      onClick={() => { setEditingChapter(ch); setShowChapterForm(false); }}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => { if (confirm(`Törlöd a ${ch.chapter_number}. fejezetet?`)) deleteChapterMutation.mutate(ch.id); }}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Reader overlay */}
      <AnimatePresence>
        {readerChapterId && chapters && chapters.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MangaReader
              chapters={sortedChapters}
              initialChapterId={readerChapterId}
              mangaTitle={manga.title}
              onClose={() => setReaderChapterId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MangaDetail;
