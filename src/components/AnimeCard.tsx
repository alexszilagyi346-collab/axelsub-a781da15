import { Link } from "react-router-dom";
import type { Anime } from "@/types/anime";

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard = ({ anime }: AnimeCardProps) => {
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
