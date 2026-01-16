import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Episode {
  id: string;
  anime_id: string;
  episode_number: number;
  title: string | null;
  video_url: string;
  created_at: string;
}

interface EpisodeListProps {
  animeId: string;
  onSelectEpisode: (episode: Episode) => void;
  selectedEpisodeId?: string;
}

const EpisodeList = ({ animeId, onSelectEpisode, selectedEpisodeId }: EpisodeListProps) => {
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
        {episodes.map((episode, index) => (
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
            </div>
            <Play
              className={`h-4 w-4 flex-shrink-0 ${
                selectedEpisodeId === episode.id ? "fill-current" : ""
              }`}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default EpisodeList;
