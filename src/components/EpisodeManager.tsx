import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Play, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
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
  // New fields
  op_start: string | null;
  op_end: string | null;
  ed_start: string | null;
  ed_end: string | null;
  backup_video_url: string | null;
  quality_480p: string | null;
  quality_720p: string | null;
  quality_1080p: string | null;
  subtitle_url: string | null;
  subtitle_type: string | null;
}

interface EpisodeManagerProps {
  animeId: string;
  animeTitle: string;
  onClose: () => void;
}

const EpisodeManager = ({ animeId, animeTitle, onClose }: EpisodeManagerProps) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newEpisode, setNewEpisode] = useState({
    episode_number: 1,
    title: "",
    video_url: "",
    // New fields
    op_start: "",
    op_end: "",
    ed_start: "",
    ed_end: "",
    backup_video_url: "",
    quality_480p: "",
    quality_720p: "",
    quality_1080p: "",
    subtitle_url: "",
    subtitle_type: "embedded",
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
        op_start: episode.op_start.trim() || null,
        op_end: episode.op_end.trim() || null,
        ed_start: episode.ed_start.trim() || null,
        ed_end: episode.ed_end.trim() || null,
        backup_video_url: episode.backup_video_url.trim() || null,
        quality_480p: episode.quality_480p.trim() || null,
        quality_720p: episode.quality_720p.trim() || null,
        quality_1080p: episode.quality_1080p.trim() || null,
        subtitle_url: episode.subtitle_url.trim() || null,
        subtitle_type: episode.subtitle_type || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", animeId] });
      resetForm();
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

  const resetForm = () => {
    setNewEpisode({
      episode_number: (episodes?.length || 0) + 2,
      title: "",
      video_url: "",
      op_start: "",
      op_end: "",
      ed_start: "",
      ed_end: "",
      backup_video_url: "",
      quality_480p: "",
      quality_720p: "",
      quality_1080p: "",
      subtitle_url: "",
      subtitle_type: "embedded",
    });
    setShowAddForm(false);
    setShowAdvanced(false);
  };

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
        className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
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
        <div className="p-4 overflow-y-auto max-h-[75vh]">
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
                {/* Basic Fields */}
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
                  <Label htmlFor="episode_video_url">Videó URL (Elsődleges szerver) *</Label>
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

                {/* Advanced Settings Toggle */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Haladó beállítások
                </Button>

                {/* Advanced Settings */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-2"
                    >
                      {/* Backup Server */}
                      <div className="space-y-2">
                        <Label htmlFor="backup_video_url">Tartalék szerver URL</Label>
                        <Input
                          id="backup_video_url"
                          type="url"
                          value={newEpisode.backup_video_url}
                          onChange={(e) => setNewEpisode({ ...newEpisode, backup_video_url: e.target.value })}
                          placeholder="https://backup.example.com/episode1.mp4"
                          className="bg-background"
                        />
                      </div>

                      {/* Quality URLs */}
                      <div className="space-y-2">
                        <Label className="text-primary">Minőség beállítások</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="quality_1080p" className="text-xs text-muted-foreground">1080p URL</Label>
                            <Input
                              id="quality_1080p"
                              type="url"
                              value={newEpisode.quality_1080p}
                              onChange={(e) => setNewEpisode({ ...newEpisode, quality_1080p: e.target.value })}
                              placeholder="1080p URL"
                              className="bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="quality_720p" className="text-xs text-muted-foreground">720p URL</Label>
                            <Input
                              id="quality_720p"
                              type="url"
                              value={newEpisode.quality_720p}
                              onChange={(e) => setNewEpisode({ ...newEpisode, quality_720p: e.target.value })}
                              placeholder="720p URL"
                              className="bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="quality_480p" className="text-xs text-muted-foreground">480p URL</Label>
                            <Input
                              id="quality_480p"
                              type="url"
                              value={newEpisode.quality_480p}
                              onChange={(e) => setNewEpisode({ ...newEpisode, quality_480p: e.target.value })}
                              placeholder="480p URL"
                              className="bg-background text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* OP/ED Timestamps */}
                      <div className="space-y-2">
                        <Label className="text-primary">Opening/Ending időbélyegek</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1 space-y-1">
                                <Label htmlFor="op_start" className="text-xs text-muted-foreground">OP kezdete</Label>
                                <Input
                                  id="op_start"
                                  value={newEpisode.op_start}
                                  onChange={(e) => setNewEpisode({ ...newEpisode, op_start: e.target.value })}
                                  placeholder="0:00"
                                  className="bg-background text-sm"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label htmlFor="op_end" className="text-xs text-muted-foreground">OP vége</Label>
                                <Input
                                  id="op_end"
                                  value={newEpisode.op_end}
                                  onChange={(e) => setNewEpisode({ ...newEpisode, op_end: e.target.value })}
                                  placeholder="1:30"
                                  className="bg-background text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1 space-y-1">
                                <Label htmlFor="ed_start" className="text-xs text-muted-foreground">ED kezdete</Label>
                                <Input
                                  id="ed_start"
                                  value={newEpisode.ed_start}
                                  onChange={(e) => setNewEpisode({ ...newEpisode, ed_start: e.target.value })}
                                  placeholder="22:00"
                                  className="bg-background text-sm"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label htmlFor="ed_end" className="text-xs text-muted-foreground">ED vége</Label>
                                <Input
                                  id="ed_end"
                                  value={newEpisode.ed_end}
                                  onChange={(e) => setNewEpisode({ ...newEpisode, ed_end: e.target.value })}
                                  placeholder="23:30"
                                  className="bg-background text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Formátum: mm:ss vagy hh:mm:ss</p>
                      </div>

                      {/* Subtitle Settings */}
                      <div className="space-y-2">
                        <Label className="text-primary">Felirat beállítások</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="subtitle_url" className="text-xs text-muted-foreground">Felirat URL (.ass/.srt)</Label>
                            <Input
                              id="subtitle_url"
                              type="url"
                              value={newEpisode.subtitle_url}
                              onChange={(e) => setNewEpisode({ ...newEpisode, subtitle_url: e.target.value })}
                              placeholder="https://example.com/sub.ass"
                              className="bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="subtitle_type" className="text-xs text-muted-foreground">Felirat típus</Label>
                            <select
                              id="subtitle_type"
                              value={newEpisode.subtitle_type}
                              onChange={(e) => setNewEpisode({ ...newEpisode, subtitle_type: e.target.value })}
                              className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
                            >
                              <option value="embedded">Beágyazott</option>
                              <option value="external">Külső</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 pt-2">
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
                  <Button type="button" variant="outline" onClick={resetForm}>
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
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                      {episode.episode_number}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {episode.title || `${episode.episode_number}. epizód`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {episode.op_start && episode.op_end && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                            OP: {episode.op_start}-{episode.op_end}
                          </span>
                        )}
                        {episode.ed_start && episode.ed_end && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                            ED: {episode.ed_start}-{episode.ed_end}
                          </span>
                        )}
                        {episode.backup_video_url && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            Tartalék
                          </span>
                        )}
                        {(episode.quality_1080p || episode.quality_720p || episode.quality_480p) && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                            Multi-minőség
                          </span>
                        )}
                        {episode.subtitle_url && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                            Felirat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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