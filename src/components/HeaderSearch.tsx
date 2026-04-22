import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAnimes } from "@/hooks/useAnimes";
import { getAnimeUrl } from "@/lib/utils";

interface HeaderSearchProps {
  className?: string;
}

const HeaderSearch = ({ className }: HeaderSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: animes, isLoading } = useAnimes();

  // Open with Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!animes) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? animes.filter((a) => {
          const title = (a.title || "").toLowerCase();
          const genre = (a.genre || "").toLowerCase();
          return title.includes(q) || genre.includes(q);
        })
      : animes.slice(0, 10);
    return list.slice(0, 12);
  }, [animes, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const goToAnime = (anime: { id: string; title: string }) => {
    navigate(getAnimeUrl(anime));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) goToAnime(results[activeIndex]);
      else if (query.trim()) {
        navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
        setOpen(false);
      }
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Anime keresés"
        className={className}
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 glass border-border/50 overflow-hidden top-[20%] translate-y-0">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Keress animét cím vagy műfaj alapján..."
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Törlés"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Betöltés...
              </div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {query.trim() ? "Nincs találat. Próbálj más keresési kifejezést!" : "Nincsenek animék."}
              </div>
            ) : (
              <ul className="py-1">
                {results.map((anime, i) => (
                  <li key={anime.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToAnime(anime)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === activeIndex ? "bg-primary/10" : "hover:bg-accent/30"
                      }`}
                    >
                      {anime.image_url ? (
                        <img
                          src={anime.image_url}
                          alt={anime.title}
                          className="w-10 h-14 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-muted rounded shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{anime.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[anime.year, anime.genre].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>↑↓ navigálás · Enter kiválasztás · Esc bezárás</span>
            <span className="hidden sm:inline">⌘K megnyitás</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeaderSearch;
