import { TrendingUp } from "lucide-react";
import AnimeCarousel from "./AnimeCarousel";
import { usePopularAnimes } from "@/hooks/useAnimes";

const TrendingSection = () => {
  const { data: animes, isLoading } = usePopularAnimes(14);

  if (!isLoading && (!animes || animes.length === 0)) return null;

  return (
    <AnimeCarousel
      title="Legtöbben Nézik"
      icon={<TrendingUp className="h-5 w-5 text-orange-400" />}
      animes={animes}
      isLoading={isLoading}
      viewAllLink="/browse"
      viewAllLabel="Összes megtekintése"
    />
  );
};

export default TrendingSection;
