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

  useEffect(() => {
    if (animes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [animes.length]);

  const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + animes.length) % animes.length);
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % animes.length);

  if (isLoading) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] bg-card">
        <Skeleton className="w-full h-full skeleton-shimmer" />
      </div>
    );
  }

  const currentAnime = animes[currentIndex];

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${currentAnime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"})`,
          }}
        />
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Neon line accent at bottom */}
      <div className="absolute bottom-0 left-0 right-0 section-glow-divider" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4"
        >
          <Star className="h-5 w-5 text-primary fill-primary" />
          <span className="text-primary font-semibold uppercase tracking-widest text-xs neon-text">
            Most Népszerű
          </span>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 max-w-2xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {currentAnime.title}
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mb-8 line-clamp-3">
              {currentAnime.description || "Nézd meg most a legnépszerűbb animét!"}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4"
        >
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 neon-glow"
            onClick={() => currentAnime.id && navigate(`/anime/${currentAnime.id}`)}
          >
            <Play className="h-5 w-5 fill-current" />
            Megtekintés
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 font-semibold transition-all"
            onClick={() => currentAnime.id && navigate(`/anime/${currentAnime.id}`)}
          >
            Részletek
          </Button>
        </motion.div>

        {/* Indicators */}
        {animes.length > 1 && (
          <div className="flex items-center gap-2 mt-8">
            {animes.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? "bg-primary w-10 neon-glow"
                    : "bg-muted-foreground/30 w-3 hover:bg-muted-foreground/60"
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full glass hover:neon-border transition-all"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full glass hover:neon-border transition-all"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
