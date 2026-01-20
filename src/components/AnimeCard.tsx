import { Link } from "react-router-dom";
import type { Anime } from "@/types/anime";
import FavoriteButton from "./FavoriteButton";
import { useAuth } from "@/hooks/useAuth";
import { useContinueWatching } from "@/hooks/useWatchHistory";

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard = ({ anime }: AnimeCardProps) => {
  const { user } = useAuth();
  const { data: continueWatching } = useContinueWatching();
  
  // Find progress for this anime
  const animeProgress = continueWatching?.find(item => item.anime_id === anime.id);
  const progressPercent = animeProgress?.duration_seconds 
    ? Math.round((animeProgress.progress_seconds / animeProgress.duration_seconds) * 100)
    : 0;

  return (
    <Link to={`/anime/${anime.id}`} className="block">
      <div className="relative group rounded-lg overflow-hidden border border-border bg-card anime-card-glow cursor-pointer">
        {/* Thumbnail */}
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={anime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80"}
            alt={anime.title}
            className="w-full h-full object-cover anime-thumbnail"
            loading="lazy"
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 gradient-overlay pointer-events-none" />
        
        {/* Favorite Button - visible on hover */}
        {user && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <FavoriteButton animeId={anime.id} size="sm" />
          </div>
        )}
        
        {/* Progress Bar - if user has watch history */}
        {user && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 z-10">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        )}
        
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-foreground font-semibold text-sm md:text-base line-clamp-2">
            {anime.title}
          </h3>
          {anime.genre && (
            <span className="text-muted-foreground text-xs mt-1 block">
              {anime.genre}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;
