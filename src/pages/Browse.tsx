import Header from "@/components/Header";
import AnimeCard from "@/components/AnimeCard";
import { useAnimes } from "@/hooks/useAnimes";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Browse = () => {
  const { data: animes, isLoading } = useAnimes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

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
    
    return animes.filter((anime) => {
      const matchesSearch = anime.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === "all" || 
        (anime.genre && anime.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
      return matchesSearch && matchesGenre;
    });
  }, [animes, searchQuery, selectedGenre]);

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

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Keresés cím alapján..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            {/* Genre Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-[180px] bg-card border-border">
                  <SelectValue placeholder="Műfaj szűrése" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes műfaj</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre.toLowerCase()}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedGenre !== "all") && (
            <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
              <span>Szűrők:</span>
              {searchQuery && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                  Keresés: "{searchQuery}"
                </span>
              )}
              {selectedGenre !== "all" && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                  Műfaj: {selectedGenre}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("all");
                }}
                className="text-primary hover:underline ml-2"
              >
                Szűrők törlése
              </button>
            </div>
          )}

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
                {searchQuery || selectedGenre !== "all" 
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
