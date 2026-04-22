import Header from "@/components/Header";
import AnimeCard from "@/components/AnimeCard";
import { useAnimes } from "@/hooks/useAnimes";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdvancedFilters, { FilterState } from "@/components/AdvancedFilters";
import { getAnimeUrl } from "@/lib/utils";

const Browse = () => {
  const { data: animes, isLoading } = useAnimes();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);
  const [filters, setFilters] = useState<FilterState>({
    genre: "",
    year: "",
    status: statusParam || "all",
    sortBy: "newest",
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, status: statusParam || "all" }));
  }, [statusParam]);

  // Extract unique genres from animes
  const genres = useMemo(() => {
    if (!animes) return [];
    const genreSet = new Set<string>();
    animes.forEach((anime) => {
      if (anime.genre) {
        // Handle comma-separated genres
        anime.genre.split(",").forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    return Array.from(genreSet).sort();
  }, [animes]);

  const filteredAnimes = useMemo(() => {
    if (!animes) return [];
    
    let result = animes.filter((anime) => {
      const matchesSearch = anime.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = !filters.genre || 
        (anime.genre && anime.genre.toLowerCase().includes(filters.genre.toLowerCase()));
      const matchesYear = !filters.year || anime.year?.toString() === filters.year;
      const matchesStatus = filters.status === "all" || anime.status === filters.status;
      
      return matchesSearch && matchesGenre && matchesYear && matchesStatus;
    });

    // Apply sorting
    switch (filters.sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case "newest":
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case "title_asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "year_desc":
        result.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case "year_asc":
        result.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
      default:
        break;
    }
    
    return result;
  }, [animes, searchQuery, filters]);

  const handleRandomAnime = () => {
    if (filteredAnimes.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredAnimes.length);
      navigate(getAnimeUrl(filteredAnimes[randomIndex]));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">Böngészés</h1>
            <p className="text-muted-foreground">
              Fedezd fel az összes elérhető animét a gyűjteményünkben.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Keresés cím alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          {/* Advanced Filters */}
          <AdvancedFilters
            genres={genres}
            filters={filters}
            onFilterChange={setFilters}
            onRandomAnime={handleRandomAnime}
            className="mb-8"
          />

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="aspect-[3/4]">
                  <Skeleton className="w-full h-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredAnimes && filteredAnimes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAnimes.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                {searchQuery || filters.genre || filters.year || filters.status !== "all"
                  ? "Nincs találat a megadott szűrőkkel." 
                  : "Még nincsenek animék az adatbázisban."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Browse;
