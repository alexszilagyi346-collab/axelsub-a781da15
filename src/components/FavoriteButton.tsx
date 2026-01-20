import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useIsFavorite, useToggleFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  animeId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const FavoriteButton = ({ animeId, size = "md", className, showLabel = false }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { data: isFavorite, isLoading } = useIsFavorite(animeId);
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "A kedvencekhez adáshoz jelentkezz be.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await toggleFavorite.mutateAsync(animeId);
      toast({
        title: result.action === "added" ? "Hozzáadva a kedvencekhez" : "Eltávolítva a kedvencekből",
      });
    } catch (error) {
      toast({
        title: "Hiba történt",
        variant: "destructive",
      });
    }
  };

  if (showLabel) {
    return (
      <motion.button
        onClick={handleClick}
        disabled={isLoading || toggleFavorite.isPending}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
          isFavorite 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          className
        )}
        whileTap={{ scale: 0.95 }}
      >
        <Heart 
          className={cn(
            iconSizes[size],
            isFavorite && "fill-current"
          )} 
        />
        <span className="text-sm font-medium">
          {isFavorite ? "Kedvenc" : "Kedvencekhez"}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading || toggleFavorite.isPending}
      className={cn(
        sizeClasses[size],
        "rounded-full flex items-center justify-center transition-all duration-200",
        isFavorite 
          ? "bg-primary text-primary-foreground" 
          : "bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-background",
        className
      )}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
    >
      <Heart 
        className={cn(
          iconSizes[size],
          isFavorite && "fill-current"
        )} 
      />
    </motion.button>
  );
};

export default FavoriteButton;
