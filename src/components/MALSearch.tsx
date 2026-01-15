import { useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MALAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  images: {
    jpg: {
      large_image_url: string;
    };
  };
  genres: { name: string }[];
  url: string;
}

interface MALSearchResult {
  data: MALAnime[];
}

interface MALSearchProps {
  onSelect: (data: { title: string; description: string; image_url: string; genre: string }) => void;
}

const MALSearch = ({ onSelect }: MALSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MALAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchMAL = async () => {
    if (!query.trim()) {
      toast.error("Adj meg egy keresési kifejezést!");
      return;
    }

    setLoading(true);
    setShowResults(true);

    try {
      const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error("Hiba a keresés során");
      }

      const data: MALSearchResult = await response.json();
      setResults(data.data || []);
      
      if (data.data?.length === 0) {
        toast.info("Nincs találat");
      }
    } catch (error) {
      console.error("MAL search error:", error);
      toast.error("Hiba a MyAnimeList keresésnél");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (anime: MALAnime) => {
    const genres = anime.genres?.map((g) => g.name).join(", ") || "";
    
    onSelect({
      title: anime.title_english || anime.title,
      description: anime.synopsis || "",
      image_url: anime.images.jpg.large_image_url,
      genre: genres,
    });
    
    setShowResults(false);
    setQuery("");
    setResults([]);
    toast.success("Adatok betöltve!");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés MyAnimeList-en..."
          className="bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchMAL();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={searchMAL}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {showResults && results.length > 0 && (
        <div className="bg-background border border-border rounded-lg max-h-80 overflow-y-auto">
          {results.map((anime) => (
            <button
              key={anime.mal_id}
              type="button"
              onClick={() => handleSelect(anime)}
              className="w-full flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0"
            >
              <img
                src={anime.images.jpg.large_image_url}
                alt={anime.title}
                className="w-12 h-16 object-cover rounded flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">
                  {anime.title_english || anime.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {anime.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {anime.synopsis?.substring(0, 100)}...
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nincs találat. Próbálj más keresési kifejezést!
        </p>
      )}
    </div>
  );
};

export default MALSearch;