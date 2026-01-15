import { Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedAnime } from "@/hooks/useAnimes";
import { Skeleton } from "@/components/ui/skeleton";

const HeroBanner = () => {
  const { data: featuredAnime, isLoading } = useFeaturedAnime();

  if (isLoading) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] bg-card">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  // Fallback content if no featured anime
  const anime = featuredAnime || {
    title: "Anime Portál",
    description: "Fedezd fel a legjobb animéket a világból. Nézd meg a legújabb és legnépszerűbb sorozatokat egy helyen.",
    image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80",
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${anime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"})` 
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary fill-primary" />
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">
            Most Népszerű
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 max-w-2xl">
          {anime.title}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground text-lg max-w-xl mb-8 line-clamp-3">
          {anime.description || "Nézd meg most a legnépszerűbb animét!"}
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
          >
            <Play className="h-5 w-5 fill-current" />
            Megtekintés
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-border text-foreground hover:bg-secondary font-semibold"
          >
            Részletek
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
