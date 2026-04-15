import { Sparkles } from "lucide-react";
import AnimeCarousel from "./AnimeCarousel";
import { useLatestAnimes } from "@/hooks/useAnimes";

const AnimeGrid = () => {
  const { data: animes, isLoading } = useLatestAnimes(16);

  return (
    <AnimeCarousel
      title="Legfrissebbek"
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      animes={animes}
      isLoading={isLoading}
      viewAllLink="/browse"
      viewAllLabel="Összes anime"
    />
  );
};

export default AnimeGrid;
