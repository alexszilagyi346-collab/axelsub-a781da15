import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { useUserRating, useAnimeRating, useSetRating } from "@/hooks/useRatings";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  animeId: string;
  showAverage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const RatingStars = ({ animeId, showAverage = true, size = "md", className }: RatingStarsProps) => {
  const { user } = useAuth();
  const { data: userRating } = useUserRating(animeId);
  const { data: animeRating } = useAnimeRating(animeId);
  const setRating = useSetRating();
  const { toast } = useToast();
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleRate = async (score: number) => {
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "Az értékeléshez jelentkezz be.",
        variant: "destructive",
      });
      return;
    }

    try {
      await setRating.mutateAsync({ animeId, score });
      toast({
        title: `${score}/10 értékelés mentve`,
      });
    } catch (error) {
      toast({
        title: "Hiba történt",
        variant: "destructive",
      });
    }
  };

  const displayScore = hoverScore || userRating?.score || 0;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <motion.button
            key={score}
            onClick={() => handleRate(score)}
            onMouseEnter={() => setHoverScore(score)}
            onMouseLeave={() => setHoverScore(null)}
            className="focus:outline-none"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                score <= displayScore
                  ? "fill-primary text-primary"
                  : "text-muted-foreground"
              )}
            />
          </motion.button>
        ))}
        {displayScore > 0 && (
          <span className="ml-2 text-sm font-medium text-foreground">
            {displayScore}/10
          </span>
        )}
      </div>
      
      {showAverage && animeRating && animeRating.count > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="w-4 h-4 fill-primary text-primary" />
          <span>
            {animeRating.average.toFixed(1)}/10 ({animeRating.count} értékelés)
          </span>
        </div>
      )}
    </div>
  );
};

export default RatingStars;
