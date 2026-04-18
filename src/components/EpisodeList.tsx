import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, FastForward, Server, Subtitles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Episode {
  id: string;
  anime_id: string;
  episode_number: number;
  title: string | null;
  video_url: string;
  created_at: string;
  // New fields for intelligent player
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

interface EpisodeListProps {
  animeId: string;
  onSelectEpisode: (episode: Episode) => void;
  selectedEpisodeId?: string;
  onEpisodesLoaded?: (episodes: Episode[]) => void;
}

const EpisodeList = ({ animeId, onSelectEpisode, selectedEpisodeId, onEpisodesLoaded }: EpisodeListProps) => {
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

  // Notify parent when episodes are loaded
  useEffect(() => {
    if (episodes && onEpisodesLoaded) {
      onEpisodesLoaded(episodes);
    }
  }, [episodes, onEpisodesLoaded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Epizódok</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {episodes.map((episode, index) => {
          const hasSkipButtons = (episode.op_start && episode.op_end) || (episode.ed_start && episode.ed_end);
          const hasBackup = !!episode.backup_video_url;
          const hasSubtitle = !!episode.subtitle_url;
          const hasMultiQuality = episode.quality_360p || episode.quality_480p || episode.quality_720p || episode.quality_1080p;

          return (
            <motion.button
              key={episode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectEpisode(episode)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left w-full ${
                selectedEpisodeId === episode.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent border border-border"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                  selectedEpisodeId === episode.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {episode.episode_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {episode.title || `${episode.episode_number}. epizód`}
                </p>
                {/* Feature indicators */}
                <div className="flex gap-1 mt-1">
                  {hasSkipButtons && (
                    <FastForward className={`h-3 w-3 ${selectedEpisodeId === episode.id ? "text-primary-foreground/70" : "text-cyan-400"}`} />
                  )}
                  {hasBackup && (
                    <Server className={`h-3 w-3 ${selectedEpisodeId === episode.id ? "text-primary-foreground/70" : "text-green-400"}`} />
                  )}
                  {hasSubtitle && (
                    <Subtitles className={`h-3 w-3 ${selectedEpisodeId === episode.id ? "text-primary-foreground/70" : "text-yellow-400"}`} />
                  )}
                  {hasMultiQuality && (
                    <span className={`text-[10px] font-medium ${selectedEpisodeId === episode.id ? "text-primary-foreground/70" : "text-purple-400"}`}>
                      HD
                    </span>
                  )}
                </div>
              </div>
              <Play
                className={`h-4 w-4 flex-shrink-0 ${
                  selectedEpisodeId === episode.id ? "fill-current" : ""
                }`}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodeList;