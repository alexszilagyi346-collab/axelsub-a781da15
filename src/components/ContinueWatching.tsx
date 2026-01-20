import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useContinueWatching } from "@/hooks/useWatchHistory";
import { useAuth } from "@/hooks/useAuth";

const ContinueWatching = () => {
  const { user } = useAuth();
  const { data: continueWatching, isLoading } = useContinueWatching();

  if (!user || isLoading || !continueWatching?.length) {
    return null;
  }

  return (
    <section className="py-6 bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto px-4">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Folytasd onnan, ahol abbahagytad
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {continueWatching.slice(0, 6).map((entry) => {
            const progressPercent = entry.duration_seconds 
              ? Math.round((entry.progress_seconds / entry.duration_seconds) * 100) 
              : 0;

            return (
              <Link
                key={entry.id}
                to={`/anime/${entry.anime_id}`}
                className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="aspect-video overflow-hidden">
                  <img
                    src={entry.anime?.image_url || "/placeholder.svg"}
                    alt={entry.anime?.title || "Anime"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground fill-current" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <h3 className="text-foreground text-sm font-medium line-clamp-1">
                    {entry.anime?.title}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {entry.episode?.episode_number}. rész • {progressPercent}%
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatching;
