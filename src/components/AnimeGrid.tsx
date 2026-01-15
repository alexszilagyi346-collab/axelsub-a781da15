import { Sparkles } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { useLatestAnimes } from "@/hooks/useAnimes";
import { Skeleton } from "@/components/ui/skeleton";

const AnimeGrid = () => {
  const { data: animes, isLoading } = useLatestAnimes(12);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Legfrissebbek</h2>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4]">
                <Skeleton className="w-full h-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : animes && animes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              Még nincsenek animék az adatbázisban.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Adj hozzá animéket a Cloud-on keresztül.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AnimeGrid;
