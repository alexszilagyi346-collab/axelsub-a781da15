import { useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Source = "mal" | "anilist" | "kitsu";

interface SearchResult {
  id: string;
  title: string;
  titleOriginal?: string;
  synopsis: string;
  imageUrl: string;
  genres: string;
  year?: number | null;
}

interface AnimeSearchProps {
  onSelect: (data: { title: string; description: string; image_url: string; genre: string; year?: number | null }) => void;
}

const searchMAL = async (query: string): Promise<SearchResult[]> => {
  const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=6`);
  if (!res.ok) throw new Error("MAL keresési hiba");
  const data = await res.json();
  return (data.data || []).map((a: any) => ({
    id: String(a.mal_id),
    title: a.title_english || a.title,
    titleOriginal: a.title,
    synopsis: a.synopsis || "",
    imageUrl: a.images?.jpg?.large_image_url || "",
    genres: (a.genres || []).map((g: any) => g.name).join(", "),
    year: a.year || null,
  }));
};

const searchAniList = async (query: string): Promise<SearchResult[]> => {
  const gql = `
    query ($search: String) {
      Page(perPage: 6) {
        media(search: $search, type: ANIME) {
          id
          title { romaji english }
          description(asHtml: false)
          coverImage { large }
          genres
          seasonYear
        }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
  });
  if (!res.ok) throw new Error("AniList keresési hiba");
  const data = await res.json();
  return (data.data?.Page?.media || []).map((a: any) => ({
    id: String(a.id),
    title: a.title?.english || a.title?.romaji || "",
    titleOriginal: a.title?.romaji || "",
    synopsis: (a.description || "").replace(/<[^>]*>/g, ""),
    imageUrl: a.coverImage?.large || "",
    genres: (a.genres || []).join(", "),
    year: a.seasonYear || null,
  }));
};

const searchKitsu = async (query: string): Promise<SearchResult[]> => {
  const res = await fetch(
    `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=6`,
    { headers: { Accept: "application/vnd.api+json" } }
  );
  if (!res.ok) throw new Error("Kitsu keresési hiba");
  const data = await res.json();
  return (data.data || []).map((a: any) => {
    const attr = a.attributes || {};
    return {
      id: a.id,
      title: attr.titles?.en || attr.titles?.en_jp || attr.canonicalTitle || "",
      titleOriginal: attr.titles?.ja_jp || attr.canonicalTitle || "",
      synopsis: attr.synopsis || "",
      imageUrl: attr.posterImage?.large || attr.posterImage?.medium || "",
      genres: "",
      year: attr.startDate ? parseInt(attr.startDate.substring(0, 4)) : null,
    };
  });
};

const SOURCE_LABELS: Record<Source, string> = {
  mal: "MyAnimeList",
  anilist: "AniList",
  kitsu: "Kitsu",
};

const AnimeSearch = ({ onSelect }: AnimeSearchProps) => {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<Source>("mal");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) {
      toast.error("Adj meg egy keresési kifejezést!");
      return;
    }
    setLoading(true);
    setShowResults(true);
    setResults([]);
    try {
      let res: SearchResult[] = [];
      if (source === "mal") res = await searchMAL(query);
      else if (source === "anilist") res = await searchAniList(query);
      else if (source === "kitsu") res = await searchKitsu(query);
      setResults(res);
      if (res.length === 0) toast.info("Nincs találat");
    } catch (e: any) {
      toast.error(e.message || "Keresési hiba");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: SearchResult) => {
    onSelect({
      title: item.title,
      description: item.synopsis,
      image_url: item.imageUrl,
      genre: item.genres,
      year: item.year,
    });
    setShowResults(false);
    setQuery("");
    setResults([]);
    toast.success(`Adatok betöltve (${SOURCE_LABELS[source]})`);
  };

  return (
    <div className="space-y-3">
      <Tabs value={source} onValueChange={(v) => { setSource(v as Source); setShowResults(false); setResults([]); }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="mal">MyAnimeList</TabsTrigger>
          <TabsTrigger value="anilist">AniList</TabsTrigger>
          <TabsTrigger value="kitsu">Kitsu</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Keresés ${SOURCE_LABELS[source]}-en...`}
          className="bg-background"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
        />
        <Button type="button" variant="secondary" onClick={doSearch} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {showResults && results.length > 0 && (
        <div className="bg-background border border-border rounded-lg max-h-80 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">{item.title}</h4>
                {item.titleOriginal && item.titleOriginal !== item.title && (
                  <p className="text-xs text-muted-foreground truncate">{item.titleOriginal}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item.synopsis?.substring(0, 120)}{item.synopsis?.length > 120 ? "..." : ""}
                </p>
                {item.genres && (
                  <p className="text-xs text-primary/70 mt-1 truncate">{item.genres}</p>
                )}
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
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

export default AnimeSearch;
