import { useState, useEffect } from "react";
import { Star, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedAnimes } from "@/hooks/useAnimes";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const HeroBanner = () => {
  const { data: featuredAnimes, isLoading } = useFeaturedAnimes();
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const animes = featuredAnimes?.length ? featuredAnimes : [{
    id: "",
    title: "Anime Portál",
    description: "Fedezd fel a legjobb animéket a világból. Nézd meg a legújabb és legnépszerűbb sorozatokat egy helyen.",
    image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80",
  }];

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (animes.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animes.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [animes.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + animes.length) % animes.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % animes.length);
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] bg-card">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const currentAnime = animes[currentIndex];

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${currentAnime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"})` 
          }}
        />
      </AnimatePresence>
      
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

        {/* Title with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 max-w-2xl">
              {currentAnime.title}
            </h1>

            <p className="text-muted-foreground text-lg max-w-xl mb-8 line-clamp-3">
              {currentAnime.description || "Nézd meg most a legnépszerűbb animét!"}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            onClick={() => currentAnime.id && navigate(`/anime/${currentAnime.id}`)}
          >
            <Play className="h-5 w-5 fill-current" />
            Megtekintés
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-border text-foreground hover:bg-secondary font-semibold"
            onClick={() => currentAnime.id && navigate(`/anime/${currentAnime.id}`)}
          >
            Részletek
          </Button>
        </div>

        {/* Indicators */}
        {animes.length > 1 && (
          <div className="flex items-center gap-2 mt-8">
            {animes.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? "bg-primary w-8" 
                    : "bg-muted-foreground/50 hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {animes.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/40 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/40 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-foreground" />
          </button>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
