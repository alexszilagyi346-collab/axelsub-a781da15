import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Play, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Episode {
  id: string;
  anime_id: string;
  episode_number: number;
  title: string | null;
  video_url: string;
  created_at: string;
}

interface EpisodeManagerProps {
  animeId: string;
  animeTitle: string;
  onClose: () => void;
}

const EpisodeManager = ({ animeId, animeTitle, onClose }: EpisodeManagerProps) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEpisode, setNewEpisode] = useState({
    episode_number: 1,
    title: "",
    video_url: "",
  });

  // Fetch episodes
  const { data: episodes, isLoading } = useQuery({
    queryKey: ["episodes", animeId],
    queryFn: async (): Promise<Episode[]> => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", animeId)
        .order("episode_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Add episode mutation
  const addEpisodeMutation = useMutation({
    mutationFn: async (episode: typeof newEpisode) => {
      const { error } = await supabase.from("episodes").insert({
        anime_id: animeId,
        episode_number: episode.episode_number,
        title: episode.title.trim() || null,
        video_url: episode.video_url.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", animeId] });
      setNewEpisode({ episode_number: (episodes?.length || 0) + 2, title: "", video_url: "" });
      setShowAddForm(false);
      toast.success("Epizód hozzáadva!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hiba az epizód hozzáadásakor!");
    },
  });

  // Delete episode mutation
  const deleteEpisodeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", episodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", animeId] });
      toast.success("Epizód törölve!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hiba az epizód törlésekor!");
    },
  });

  const handleAddEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEpisode.video_url.trim()) {
      toast.error("A videó URL megadása kötelező!");
      return;
    }
    addEpisodeMutation.mutate(newEpisode);
  };

  const handleDeleteEpisode = (episode: Episode) => {
    if (!confirm(`Biztosan törölni szeretnéd a(z) ${episode.episode_number}. epizódot?`)) return;
    deleteEpisodeMutation.mutate(episode.id);
  };

  // Set next episode number when episodes load
  const nextEpisodeNumber = (episodes?.length || 0) + 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Epizódok kezelése</h2>
            <p className="text-sm text-muted-foreground">{animeTitle}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Add Episode Button */}
          {!showAddForm && (
            <Button
              onClick={() => {
                setNewEpisode({ ...newEpisode, episode_number: nextEpisodeNumber });
                setShowAddForm(true);
              }}
              className="w-full mb-4 bg-primary hover:bg-primary/90 gap-2"
            >
              <Plus className="h-5 w-5" />
              Új epizód hozzáadása
            </Button>
          )}

          {/* Add Episode Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddEpisode}
                className="bg-accent/30 rounded-lg p-4 mb-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="episode_number">Epizód száma *</Label>
                    <Input
                      id="episode_number"
                      type="number"
                      min={1}
                      value={newEpisode.episode_number}
                      onChange={(e) =>
                        setNewEpisode({ ...newEpisode, episode_number: parseInt(e.target.value) || 1 })
                      }
                      className="bg-background"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episode_title">Epizód címe</Label>
                    <Input
                      id="episode_title"
                      value={newEpisode.title}
                      onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                      placeholder="pl. A kezdet"
                      className="bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="episode_video_url">Videó URL *</Label>
                  <Input
                    id="episode_video_url"
                    type="url"
                    value={newEpisode.video_url}
                    onChange={(e) => setNewEpisode({ ...newEpisode, video_url: e.target.value })}
                    placeholder="https://example.com/episode1.mp4"
                    className="bg-background"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 gap-2"
                    disabled={addEpisodeMutation.isPending}
                  >
                    {addEpisodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Hozzáadás
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Mégse
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Episodes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : episodes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Még nincs epizód hozzáadva.
            </div>
          ) : (
            <div className="space-y-2">
              {episodes?.map((episode) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {episode.episode_number}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {episode.title || `${episode.episode_number}. epizód`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {episode.video_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(episode.video_url, "_blank")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEpisode(episode)}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deleteEpisodeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EpisodeManager;
