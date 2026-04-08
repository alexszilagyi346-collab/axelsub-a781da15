import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { motion } from "framer-motion";

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

const News = () => {
  const { data: recentEpisodes, isLoading } = useQuery({
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Newspaper className="h-8 w-8 text-primary" />
              Hírek & Frissítések
            </h1>
            <p className="text-muted-foreground">
              Az összes legújabb epizód és frissítés egy helyen.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : recentEpisodes && recentEpisodes.length > 0 ? (
            <div className="space-y-3">
              {recentEpisodes.map((ep, i) => (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/anime/${ep.anime?.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl glass border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {ep.anime?.image_url ? (
                        <img
                          src={ep.anime.image_url}
                          alt={ep.anime.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Newspaper className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {ep.anime?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ep.episode_number}. rész
                        {ep.title && ` — ${ep.title}`}
                      </p>
                      {ep.anime?.genre && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{ep.anime.genre}</p>
                      )}
                    </div>

                    {/* Date */}
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
              <p className="text-muted-foreground text-lg">Még nincsenek hírek.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default News;
