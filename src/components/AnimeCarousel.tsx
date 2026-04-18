import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AnimeCard from "./AnimeCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Anime } from "@/types/anime";

interface AnimeCarouselProps {
  title: string;
  icon: React.ReactNode;
  animes: Anime[] | undefined;
  isLoading?: boolean;
  viewAllLink?: string;
  viewAllLabel?: string;
}

const AnimeCarousel = ({
  title,
  icon,
  animes,
  isLoading,
  viewAllLink = "/browse",
  viewAllLabel = "Összes megtekintése",
}: AnimeCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {title}
            </h2>
            <div className="hidden sm:block h-px w-24 bg-gradient-to-r from-primary/40 to-transparent ml-2" />
          </div>
          <Link
            to={viewAllLink}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors group"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative group/carousel">
          {/* Prev button */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-3 w-10 h-10 rounded-full glass border border-border/60 flex items-center justify-center shadow-lg transition-all duration-200
              ${canScrollPrev
                ? "opacity-0 group-hover/carousel:opacity-100 hover:border-primary/50 hover:text-primary"
                : "opacity-0 pointer-events-none"
              }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Next button */}
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-3 w-10 h-10 rounded-full glass border border-border/60 flex items-center justify-center shadow-lg transition-all duration-200
              ${canScrollNext
                ? "opacity-0 group-hover/carousel:opacity-100 hover:border-primary/50 hover:text-primary"
                : "opacity-0 pointer-events-none"
              }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Fade edges */}
          {canScrollPrev && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          )}
          {canScrollNext && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          )}

          {/* Scroll container */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-3 md:gap-4">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-36 sm:w-40 md:w-44">
                      <Skeleton className="aspect-[3/4] rounded-xl skeleton-shimmer" />
                      <Skeleton className="h-4 mt-2 rounded" />
                    </div>
                  ))
                : animes?.map((anime, index) => (
                    <motion.div
                      key={anime.id}
                      className="flex-shrink-0 w-36 sm:w-40 md:w-44"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                    >
                      <AnimeCard anime={anime} />
                    </motion.div>
                  ))}

              {/* "See all" card at the end */}
              {!isLoading && animes && animes.length > 0 && (
                <div className="flex-shrink-0 w-36 sm:w-40 md:w-44">
                  <Link to={viewAllLink}>
                    <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-all group/all text-muted-foreground hover:text-primary">
                      <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 group-hover/all:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-xs font-medium text-center px-2">
                        Összes<br />megtekintése
                      </span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimeCarousel;
