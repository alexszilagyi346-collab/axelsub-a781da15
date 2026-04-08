import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { Anime } from "@/types/anime";
import FavoriteButton from "./FavoriteButton";
import { useAuth } from "@/hooks/useAuth";
import { useContinueWatching } from "@/hooks/useWatchHistory";
import { Badge } from "@/components/ui/badge";

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard = ({ anime }: AnimeCardProps) => {
  const { user } = useAuth();
  const { data: continueWatching } = useContinueWatching();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const animeProgress = continueWatching?.find(item => item.anime_id === anime.id);
  const progressPercent = animeProgress?.duration_seconds
    ? Math.round((animeProgress.progress_seconds / animeProgress.duration_seconds) * 100)
    : 0;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <Link to={`/anime/${anime.id}`} className="block">
      <motion.div
        ref={cardRef}
        className="relative group rounded-xl overflow-hidden glass-card cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          perspective: "800px",
        }}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail */}
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={anime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80"}
            alt={anime.title}
            className="w-full h-full object-cover anime-thumbnail"
            loading="lazy"
          />
        </div>

        {/* Neon top border on hover */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "linear-gradient(90deg, hsl(271 91% 65%), hsl(280 100% 70%))",
            transformOrigin: "left",
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 gradient-overlay pointer-events-none" />

        {/* Glow overlay on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(271 91% 65% / 0.1), transparent 70%)",
          }}
        />

        {/* New Episodes Badge */}
        {anime.episodes_count != null && anime.episodes_count > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 shadow-lg">
              {anime.episodes_count} rész
            </Badge>
          </div>
        )}

        {/* Favorite Button */}
        {user && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <FavoriteButton animeId={anime.id} size="sm" />
          </div>
        )}

        {/* Progress Bar */}
        {user && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 z-10">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Title & Genre & Episodes */}
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
      </motion.div>
    </Link>
  );
};

export default AnimeCard;
