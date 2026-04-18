import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Play, Loader2, X, ChevronDown, ChevronUp, Pencil, Save, Upload, FileText } from "lucide-react";
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
  op_start: string | null;
  op_end: string | null;
  ed_start: string | null;
  ed_end: string | null;
  backup_video_url: string | null;
  quality_360p: string | null;
  quality_480p: string | null;
  quality_720p: string | null;
  quality_1080p: string | null;
  subtitle_url: string | null;
  subtitle_type: string | null;
}

interface EpisodeFormData {
  episode_number: number;
  title: string;
  video_url: string;
  op_start: string;
  op_end: string;
  ed_start: string;
  ed_end: string;
  backup_video_url: string;
  quality_360p: string;
  quality_480p: string;
  quality_720p: string;
  quality_1080p: string;
  subtitle_url: string;
  subtitle_type: string;
  player_type: "player1" | "player2";
}

type SubtitleFormat = "ass" | "srt" | "vtt";

interface EpisodeManagerProps {
  animeId: string;
  animeTitle: string;
  onClose: () => void;
}

const getEmptyFormData = (episodeNumber: number = 1): EpisodeFormData => ({
  episode_number: episodeNumber,
  title: "",
  video_url: "",
  op_start: "",
  op_end: "",
  ed_start: "",
  ed_end: "",
  backup_video_url: "",
  quality_360p: "",
  quality_480p: "",
  quality_720p: "",
  quality_1080p: "",
  subtitle_url: "",
  subtitle_type: "embedded",
  player_type: "player1",
});

const detectSubtitleFormat = (url: string): SubtitleFormat | null => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.ass')) return 'ass';
  if (lowerUrl.endsWith('.srt')) return 'srt';
  if (lowerUrl.endsWith('.vtt')) return 'vtt';
  return null;
};

const episodeToFormData = (episode: Episode): EpisodeFormData => ({
  episode_number: episode.episode_number,
  title: episode.title || "",
  video_url: episode.video_url,
  op_start: episode.op_start || "",
  op_end: episode.op_end || "",
  ed_start: episode.ed_start || "",
  ed_end: episode.ed_end || "",
  backup_video_url: episode.backup_video_url || "",
  quality_360p: episode.quality_360p || "",
  quality_480p: episode.quality_480p || "",
  quality_720p: episode.quality_720p || "",
  quality_1080p: episode.quality_1080p || "",
  subtitle_url: episode.subtitle_url || "",
  subtitle_type: episode.subtitle_type || "embedded",
  player_type: episode.subtitle_type === "external" ? "player2" : "player1",
});

const EpisodeManager = ({ animeId, animeTitle, onClose }: EpisodeManagerProps) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [editAdvanced, setEditAdvanced] = useState(false);
  const [formData, setFormData] = useState<EpisodeFormData>(getEmptyFormData());
  const [editFormData, setEditFormData] = useState<EpisodeFormData>(getEmptyFormData());
  
  // Subtitle file upload states
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [editSubtitleFile, setEditSubtitleFile] = useState<File | null>(null);
  const [uploadingSubtitle, setUploadingSubtitle] = useState(false);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const editSubtitleInputRef = useRef<HTMLInputElement>(null);

  // Upload subtitle file to storage
  const uploadSubtitleFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `subtitles/${animeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("animek")
      .upload(fileName, file);

    if (error) {
      console.error("Subtitle upload error:", error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("animek")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubtitleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["ass", "srt", "vtt"].includes(ext || "")) {
        toast.error("Csak .ass, .srt vagy .vtt fájlok engedélyezettek!");
        return;
      }
      if (isEdit) {
        setEditSubtitleFile(file);
      } else {
        setSubtitleFile(file);
      }
      toast.success(`Felirat kiválasztva: ${file.name}`);
    }
  };

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
    mutationFn: async (episode: EpisodeFormData) => {
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
        quality_360p: episode.quality_360p.trim() || null,
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
      resetAddForm();
      toast.success("Epizód hozzáadva!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Hiba az epizód hozzáadásakor!");
    },
  });

  // Update episode mutation
  const updateEpisodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EpisodeFormData }) => {
      const { error } = await supabase
        .from("episodes")
        .update({
          episode_number: data.episode_number,
          title: data.title.trim() || null,
          video_url: data.video_url.trim(),
          op_start: data.op_start.trim() || null,
          op_end: data.op_end.trim() || null,
          ed_start: data.ed_start.trim() || null,
          ed_end: data.ed_end.trim() || null,
          backup_video_url: data.backup_video_url.trim() || null,
          quality_360p: data.quality_360p.trim() || null,
          quality_480p: data.quality_480p.trim() || null,
          quality_720p: data.quality_720p.trim() || null,
          quality_1080p: data.quality_1080p.trim() || null,
          subtitle_url: data.subtitle_url.trim() || null,
          subtitle_type: data.subtitle_type || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", animeId] });
      cancelEdit();
      toast.success("Epizód frissítve!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Hiba az epizód frissítésekor!");
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
    onError: (error: Error) => {
      toast.error(error.message || "Hiba az epizód törlésekor!");
    },
  });

  const resetAddForm = () => {
    setFormData(getEmptyFormData((episodes?.length || 0) + 2));
    setShowAddForm(false);
    setShowAdvanced(false);
  };

  const startEdit = (episode: Episode) => {
    setEditingEpisodeId(episode.id);
    setEditFormData(episodeToFormData(episode));
    setEditAdvanced(false);
  };

  const cancelEdit = () => {
    setEditingEpisodeId(null);
    setEditFormData(getEmptyFormData());
    setEditAdvanced(false);
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.video_url.trim()) {
      toast.error("A videó URL megadása kötelező!");
      return;
    }
    
    try {
      setUploadingSubtitle(true);
      let finalSubtitleUrl = formData.subtitle_url;
      
      // Upload subtitle file if selected
      if (subtitleFile) {
        finalSubtitleUrl = await uploadSubtitleFile(subtitleFile);
      }
      
      addEpisodeMutation.mutate({
        ...formData,
        subtitle_url: finalSubtitleUrl,
      });
      setSubtitleFile(null);
    } catch (error: any) {
      toast.error("Hiba a felirat feltöltésekor: " + error.message);
    } finally {
      setUploadingSubtitle(false);
    }
  };

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisodeId) return;
    if (!editFormData.video_url.trim()) {
      toast.error("A videó URL megadása kötelező!");
      return;
    }
    
    try {
      setUploadingSubtitle(true);
      let finalSubtitleUrl = editFormData.subtitle_url;
      
      // Upload subtitle file if selected
      if (editSubtitleFile) {
        finalSubtitleUrl = await uploadSubtitleFile(editSubtitleFile);
      }
      
      updateEpisodeMutation.mutate({ 
        id: editingEpisodeId, 
        data: {
          ...editFormData,
          subtitle_url: finalSubtitleUrl,
        }
      });
      setEditSubtitleFile(null);
    } catch (error: any) {
      toast.error("Hiba a felirat feltöltésekor: " + error.message);
    } finally {
      setUploadingSubtitle(false);
    }
  };

  const handleDeleteEpisode = (episode: Episode) => {
    if (!confirm(`Biztosan törölni szeretnéd a(z) ${episode.episode_number}. epizódot?`)) return;
    deleteEpisodeMutation.mutate(episode.id);
  };

  const nextEpisodeNumber = (episodes?.length || 0) + 1;

  // Episode Form Component (reused for both add and edit)
  const EpisodeForm = ({
    data,
    setData,
    onSubmit,
    onCancel,
    isPending,
    showAdvancedState,
    setShowAdvancedState,
    submitLabel,
    submitIcon: SubmitIcon,
    selectedFile,
    onFileSelect,
    fileInputRef,
  }: {
    data: EpisodeFormData;
    setData: React.Dispatch<React.SetStateAction<EpisodeFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    isPending: boolean;
    showAdvancedState: boolean;
    setShowAdvancedState: (val: boolean) => void;
    submitLabel: string;
    submitIcon: typeof Plus;
    selectedFile: File | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={onSubmit}
      className="bg-accent/30 rounded-lg p-4 mb-4 space-y-4"
    >
      {/* Basic Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Epizód száma *</Label>
          <Input
            type="number"
            min={1}
            value={data.episode_number}
            onChange={(e) => setData({ ...data, episode_number: parseInt(e.target.value) || 1 })}
            className="bg-background"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Epizód címe</Label>
          <Input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="pl. A kezdet"
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Videó URL (Elsődleges szerver) *</Label>
        <Input
          type="url"
          value={data.video_url}
          onChange={(e) => setData({ ...data, video_url: e.target.value })}
          placeholder="https://example.com/episode1.mp4"
          className="bg-background"
          required
        />
      </div>

      {/* Player Type Selector - Always visible */}
      <div className="space-y-3">
        <Label className="text-primary font-semibold">Lejátszó típus választása</Label>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setData({ ...data, player_type: "player1", subtitle_type: "embedded" })}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              data.player_type === "player1"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                data.player_type === "player1" ? "border-primary" : "border-muted-foreground"
              }`}>
                {data.player_type === "player1" && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-semibold text-foreground">1-es Lejátszó</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Beégetett/normál feliratokhoz. Standard lejátszó.
            </p>
          </div>
          <div
            onClick={() => setData({ ...data, player_type: "player2", subtitle_type: "external" })}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              data.player_type === "player2"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                data.player_type === "player2" ? "border-cyan-500" : "border-muted-foreground"
              }`}>
                {data.player_type === "player2" && (
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                )}
              </div>
              <span className="font-semibold text-foreground">2-es Lejátszó</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Külső feliratokhoz (ASS/SRT/VTT).
            </p>
          </div>
        </div>
      </div>

      {/* Subtitle Settings - Only show for Player 2 */}
      {data.player_type === "player2" && (
        <div className="space-y-3 p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
          <Label className="text-cyan-400">Külső felirat beállítások</Label>
          
          {/* File Upload Option */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Felirat fájl feltöltése (.ass/.srt/.vtt)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : "Fájl kiválasztása"}
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Clear selected file by triggering empty change
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ass,.srt,.vtt"
              onChange={onFileSelect}
              className="hidden"
            />
            {selectedFile && (
              <p className="text-xs text-cyan-400 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Kiválasztva: {selectedFile.name} ({detectSubtitleFormat(selectedFile.name)?.toUpperCase()})
              </p>
            )}
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-cyan-500/30" />
            <span className="text-xs text-muted-foreground">vagy</span>
            <div className="flex-1 h-px bg-cyan-500/30" />
          </div>
          
          {/* URL Option */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Felirat URL megadása</Label>
            <Input
              type="url"
              value={data.subtitle_url}
              onChange={(e) => setData({ ...data, subtitle_url: e.target.value })}
              placeholder="https://example.com/subtitle.ass"
              className="bg-background text-sm"
              disabled={!!selectedFile}
            />
            {data.subtitle_url && !selectedFile && (
              <p className="text-xs text-cyan-400">
                Formátum: {detectSubtitleFormat(data.subtitle_url)?.toUpperCase() || "Ismeretlen"}
              </p>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            A 2-es lejátszó automatikusan betölti és megjeleníti a feliratot.
          </p>
        </div>
      )}

      {/* Advanced Settings Toggle */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => setShowAdvancedState(!showAdvancedState)}
      >
        {showAdvancedState ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Haladó beállítások (OP/ED, minőség, tartalék szerver)
      </Button>

      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvancedState && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-2"
          >
            {/* Backup Server */}
            <div className="space-y-2">
              <Label>Tartalék szerver URL</Label>
              <Input
                type="url"
                value={data.backup_video_url}
                onChange={(e) => setData({ ...data, backup_video_url: e.target.value })}
                placeholder="https://backup.example.com/episode1.mp4"
                className="bg-background"
              />
            </div>

            {/* Quality URLs */}
            <div className="space-y-2">
              <Label className="text-primary">Minőség beállítások</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">1080p URL</Label>
                  <Input
                    type="url"
                    value={data.quality_1080p}
                    onChange={(e) => setData({ ...data, quality_1080p: e.target.value })}
                    placeholder="1080p URL"
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">720p URL</Label>
                  <Input
                    type="url"
                    value={data.quality_720p}
                    onChange={(e) => setData({ ...data, quality_720p: e.target.value })}
                    placeholder="720p URL"
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">480p URL</Label>
                  <Input
                    type="url"
                    value={data.quality_480p}
                    onChange={(e) => setData({ ...data, quality_480p: e.target.value })}
                    placeholder="480p URL"
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">360p URL</Label>
                  <Input
                    type="url"
                    value={data.quality_360p}
                    onChange={(e) => setData({ ...data, quality_360p: e.target.value })}
                    placeholder="360p URL"
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
                      <Label className="text-xs text-muted-foreground">OP kezdete</Label>
                      <Input
                        value={data.op_start}
                        onChange={(e) => setData({ ...data, op_start: e.target.value })}
                        placeholder="0:00"
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">OP vége</Label>
                      <Input
                        value={data.op_end}
                        onChange={(e) => setData({ ...data, op_end: e.target.value })}
                        placeholder="1:30"
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">ED kezdete</Label>
                      <Input
                        value={data.ed_start}
                        onChange={(e) => setData({ ...data, ed_start: e.target.value })}
                        placeholder="22:00"
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">ED vége</Label>
                      <Input
                        value={data.ed_end}
                        onChange={(e) => setData({ ...data, ed_end: e.target.value })}
                        placeholder="23:30"
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Formátum: mm:ss vagy hh:mm:ss</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="bg-primary hover:bg-primary/90 gap-2" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SubmitIcon className="h-4 w-4" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Mégse
        </Button>
      </div>
    </motion.form>
  );

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
          {!showAddForm && !editingEpisodeId && (
            <Button
              onClick={() => {
                setFormData(getEmptyFormData(nextEpisodeNumber));
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
              <EpisodeForm
                data={formData}
                setData={setFormData}
                onSubmit={handleAddEpisode}
                onCancel={resetAddForm}
                isPending={addEpisodeMutation.isPending || uploadingSubtitle}
                showAdvancedState={showAdvanced}
                setShowAdvancedState={setShowAdvanced}
                submitLabel={uploadingSubtitle ? "Feltöltés..." : "Hozzáadás"}
                submitIcon={Plus}
                selectedFile={subtitleFile}
                onFileSelect={(e) => handleSubtitleFileSelect(e, false)}
                fileInputRef={subtitleInputRef}
              />
            )}
          </AnimatePresence>

          {/* Episodes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : episodes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Még nincs epizód hozzáadva.</div>
          ) : (
            <div className="space-y-2">
              {episodes?.map((episode) => (
                <div key={episode.id}>
                  {editingEpisodeId === episode.id ? (
                    <EpisodeForm
                      data={editFormData}
                      setData={setEditFormData}
                      onSubmit={handleUpdateEpisode}
                      onCancel={cancelEdit}
                      isPending={updateEpisodeMutation.isPending || uploadingSubtitle}
                      showAdvancedState={editAdvanced}
                      setShowAdvancedState={setEditAdvanced}
                      submitLabel={uploadingSubtitle ? "Feltöltés..." : "Mentés"}
                      submitIcon={Save}
                      selectedFile={editSubtitleFile}
                      onFileSelect={(e) => handleSubtitleFileSelect(e, true)}
                      fileInputRef={editSubtitleInputRef}
                    />
                  ) : (
                    <motion.div
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
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(episode)}
                          className="text-muted-foreground hover:text-primary"
                          disabled={showAddForm}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EpisodeManager;