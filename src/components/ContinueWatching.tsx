import { Link } from "react-router-dom";
import { Play, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useContinueWatching } from "@/hooks/useWatchHistory";
import { useAuth } from "@/hooks/useAuth";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const ContinueWatching = () => {
  const { user } = useAuth();
  const { data: continueWatching, isLoading } = useContinueWatching();

  if (!user || isLoading || !continueWatching?.length) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Folytasd ahol abbahagytad
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent ml-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {continueWatching.slice(0, 8).map((entry, index) => {
            const progressPercent = entry.duration_seconds
              ? Math.round((entry.progress_seconds / entry.duration_seconds) * 100)
              : 0;
            const remaining = entry.duration_seconds
              ? entry.duration_seconds - entry.progress_seconds
              : 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <Link
                  to={`/anime/${entry.anime_id}`}
                  className="group relative flex gap-3 rounded-xl overflow-hidden glass-card p-3 hover:border-primary/50 transition-all duration-300 border border-border/50"
                >
                  {/* Thumbnail with play overlay */}
                  <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={entry.anime?.image_url || "/placeholder.svg"}
                      alt={entry.anime?.title || "Anime"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Progress bar on thumbnail */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Play className="w-4 h-4 text-primary-foreground fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <h3 className="text-foreground text-sm font-semibold line-clamp-1">
                      {entry.anime?.title}
                    </h3>
                    <p className="text-primary text-xs font-medium">
                      {entry.episode?.episode_number}. rész
                      {entry.episode?.title ? ` – ${entry.episode.title}` : ""}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {progressPercent}% • {remaining > 0 ? `${formatTime(remaining)} van hátra` : ""}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatching;
