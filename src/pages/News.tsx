import Header from "@/components/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Clock, Pin, Megaphone, Zap, Trash2, Plus, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { getAnimeUrl } from "@/lib/utils";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecentEpisode {
  id: string;
  episode_number: number;
  title: string | null;
  created_at: string;
  anime: {
    id: string;
    title: string;
    image_url: string | null;
    genre: string | null;
  };
}

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  category: string;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
}

const categoryLabels: Record<string, { label: string; icon: typeof Megaphone; color: string }> = {
  announcement: { label: "Közlemény", icon: Megaphone, color: "bg-primary text-primary-foreground" },
  update: { label: "Frissítés", icon: Zap, color: "bg-blue-500/20 text-blue-400" },
  event: { label: "Esemény", icon: Newspaper, color: "bg-amber-500/20 text-amber-400" },
};

const NewsPostForm = ({ post, onDone }: { post?: NewsPost; onDone: () => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [imageUrl, setImageUrl] = useState(post?.image_url || "");
  const [category, setCategory] = useState(post?.category || "announcement");
  const [isPinned, setIsPinned] = useState(post?.is_pinned || false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (post) {
        const { error } = await supabase.from("news_posts").update({
          title, content, image_url: imageUrl || null, category, is_pinned: isPinned,
        }).eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news_posts").insert({
          title, content, image_url: imageUrl || null, category, is_pinned: isPinned,
          author_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-posts"] });
      toast.success(post ? "Hír frissítve!" : "Hír közzétéve!");
      onDone();
    },
    onError: () => toast.error("Hiba történt!"),
  });

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="glass border border-border/30 rounded-xl p-6 mb-6 space-y-4">
      <h3 className="font-bold text-foreground text-lg">{post ? "Hír szerkesztése" : "Új hír közzététele"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground">Cím</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Hír címe..." className="bg-background border-border" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground">Tartalom</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Hír tartalma..." rows={4} className="bg-background border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Kép URL (opcionális)</Label>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="bg-background border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Kategória</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Közlemény</SelectItem>
              <SelectItem value="update">Frissítés</SelectItem>
              <SelectItem value="event">Esemény</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          <Label className="text-foreground">Kitűzött</Label>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => mutation.mutate()} disabled={!title || !content || mutation.isPending}>
          {mutation.isPending ? "Mentés..." : post ? "Mentés" : "Közzététel"}
        </Button>
        <Button variant="ghost" onClick={onDone}>Mégse</Button>
      </div>
    </motion.div>
  );
};

const News = () => {
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);

  const { data: newsPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["news-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsPost[];
    },
  });

  const { data: recentEpisodes, isLoading: episodesLoading } = useQuery({
    queryKey: ["news-recent-episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, episode_number, title, created_at, anime:animes(id, title, image_url, genre)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as RecentEpisode[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-posts"] });
      toast.success("Hír törölve!");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-primary" />
                Hírek & Frissítések
              </h1>
              <p className="text-muted-foreground">Az összes legújabb hír és epizód egy helyen.</p>
            </div>
            {isAdmin && (
              <Button onClick={() => { setShowForm(!showForm); setEditingPost(null); }} className="gap-2">
                <Plus className="h-4 w-4" /> Új hír
              </Button>
            )}
          </div>

          <AnimatePresence>
            {(showForm || editingPost) && (
              <NewsPostForm
                post={editingPost || undefined}
                onDone={() => { setShowForm(false); setEditingPost(null); }}
              />
            )}
          </AnimatePresence>

          <Tabs defaultValue="news" className="w-full">
            <TabsList className="mb-6 glass">
              <TabsTrigger value="news">Közlemények</TabsTrigger>
              <TabsTrigger value="episodes">Új epizódok</TabsTrigger>
            </TabsList>

            <TabsContent value="news">
              {postsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
              ) : newsPosts && newsPosts.length > 0 ? (
                <div className="space-y-4">
                  {newsPosts.map((post, i) => {
                    const cat = categoryLabels[post.category] || categoryLabels.announcement;
                    const Icon = cat.icon;
                    return (
                      <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="glass border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                        <div className="flex">
                          {post.image_url && (
                            <div className="w-32 sm:w-48 flex-shrink-0">
                              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                                  <Badge className={cat.color}><Icon className="h-3 w-3 mr-1" />{cat.label}</Badge>
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">{post.title}</h3>
                                <p className="text-muted-foreground text-sm line-clamp-3">{post.content}</p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-3">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(post.created_at), "yyyy. MMM d. HH:mm", { locale: hu })}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingPost(post); setShowForm(false); }}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => { if(confirm("Biztosan törlöd?")) deleteMutation.mutate(post.id); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Még nincsenek közlemények.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="episodes">
              {episodesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
              ) : recentEpisodes && recentEpisodes.length > 0 ? (
                <div className="space-y-3">
                  {recentEpisodes.map((ep, i) => (
                    <motion.div key={ep.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Link to={ep.anime ? getAnimeUrl({ id: ep.anime.id, title: ep.anime.title }) : "#"}
                        className="flex items-center gap-4 p-4 rounded-xl glass border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                        <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {ep.anime?.image_url ? (
                            <img src={ep.anime.image_url} alt={ep.anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Newspaper className="h-6 w-6" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{ep.anime?.title}</h3>
                          <p className="text-sm text-muted-foreground">{ep.episode_number}. rész{ep.title && ` — ${ep.title}`}</p>
                          {ep.anime?.genre && <p className="text-xs text-muted-foreground/60 mt-0.5">{ep.anime.genre}</p>}
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(ep.created_at), "yyyy. MMM d.", { locale: hu })}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Még nincsenek epizódok.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default News;
