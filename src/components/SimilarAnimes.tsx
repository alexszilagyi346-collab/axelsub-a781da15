import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import type { Anime } from "@/types/anime";
import { getAnimeUrl } from "@/lib/utils";

interface SimilarAnimesProps {
  currentAnimeId: string;
  genre: string | null;
}

const SimilarAnimes = ({ currentAnimeId, genre }: SimilarAnimesProps) => {
  const { data: similarAnimes, isLoading } = useQuery({
    queryKey: ["similar-animes", currentAnimeId, genre],
    queryFn: async () => {
      if (!genre) return [];

      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .ilike("genre", `%${genre.split(",")[0].trim()}%`)
        .neq("id", currentAnimeId)
        .limit(6);

      if (error) throw error;
      return data as Anime[];
    },
    enabled: !!genre,
  });

  if (isLoading || !similarAnimes || similarAnimes.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Hasonló animék
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {similarAnimes.map((anime) => (
          <Link
            key={anime.id}
            to={getAnimeUrl(anime)}
            className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300"
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={anime.image_url || "/placeholder.svg"}
                alt={anime.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-foreground font-medium text-sm line-clamp-2">
                {anime.title}
              </h3>
              {anime.genre && (
                <span className="text-muted-foreground text-xs">
                  {anime.genre.split(",")[0].trim()}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default SimilarAnimes;
