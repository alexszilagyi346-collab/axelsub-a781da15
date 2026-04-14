import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen, ZoomIn, ZoomOut, LayoutList, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  page_urls: string[];
}

interface MangaReaderProps {
  chapters: Chapter[];
  initialChapterId: string;
  mangaTitle: string;
  onClose: () => void;
}

type ReadMode = "single" | "strip";

const MangaReader = ({ chapters, initialChapterId, mangaTitle, onClose }: MangaReaderProps) => {
  const [currentChapterId, setCurrentChapterId] = useState(initialChapterId);
  const [currentPage, setCurrentPage] = useState(0);
  const [readMode, setReadMode] = useState<ReadMode>("single");
  const [zoom, setZoom] = useState(100);
  const [imgLoaded, setImgLoaded] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const chapter = chapters.find(c => c.id === currentChapterId);
  const chapterIndex = chapters.findIndex(c => c.id === currentChapterId);
  const pages = chapter?.page_urls || [];
  const totalPages = pages.length;

  const prevChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(clamped);
    setImgLoaded(false);
  }, [totalPages]);

  const goNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else if (nextChapter) {
      setCurrentChapterId(nextChapter.id);
      setCurrentPage(0);
      setImgLoaded(false);
    }
  }, [currentPage, totalPages, nextChapter, goToPage]);

  const goPrevPage = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    } else if (prevChapter) {
      setCurrentChapterId(prevChapter.id);
      setCurrentPage(0);
      setImgLoaded(false);
    }
  }, [currentPage, prevChapter, goToPage]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNextPage();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrevPage();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNextPage, goPrevPage, onClose]);

  useEffect(() => {
    setCurrentPage(0);
    setImgLoaded(false);
  }, [currentChapterId]);

  if (!chapter) return null;

  const chapterLabel = `${chapter.chapter_number}. fejezet${chapter.title ? ` – ${chapter.title}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/90 border-b border-white/10 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 shrink-0">
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{mangaTitle}</p>
          <p className="text-white/60 text-xs truncate">{chapterLabel}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Read mode toggle */}
          <Button
            variant="ghost" size="icon"
            onClick={() => setReadMode(m => m === "single" ? "strip" : "single")}
            className="text-white hover:bg-white/10"
            title={readMode === "single" ? "Csík mód" : "Egyoldalas mód"}
          >
            {readMode === "single" ? <LayoutList className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
          </Button>

          {/* Zoom controls (single mode only) */}
          {readMode === "single" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-white hover:bg-white/10 hidden sm:flex">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white/60 text-xs hidden sm:block w-10 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-white hover:bg-white/10 hidden sm:flex">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Chapter selector */}
          <Select value={currentChapterId} onValueChange={id => { setCurrentChapterId(id); setCurrentPage(0); }}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {chapters.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.chapter_number}. fejezet{c.title ? ` – ${c.title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reader area */}
      {pages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/50">
            <BookOpen className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p>Ehhez a fejezethez még nincs oldal feltöltve.</p>
          </div>
        </div>
      ) : readMode === "single" ? (
        /* ── SINGLE PAGE MODE (left→right) ── */
        <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none">
          {/* Left click area */}
          <button
            onClick={goPrevPage}
            className="absolute left-0 top-0 h-full w-1/3 z-10 flex items-center justify-start pl-2 group"
            aria-label="Előző oldal"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
              <ChevronLeft className="h-8 w-8 text-white" />
            </div>
          </button>

          {/* Image */}
          <div className="relative h-full flex items-center justify-center">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              key={`${currentChapterId}-${currentPage}`}
              src={pages[currentPage]}
              alt={`${currentPage + 1}. oldal`}
              className="max-h-full max-w-full object-contain transition-opacity duration-200"
              style={{ width: `${zoom}%`, maxWidth: "100%", opacity: imgLoaded ? 1 : 0 }}
              onLoad={() => setImgLoaded(true)}
              draggable={false}
            />
          </div>

          {/* Right click area */}
          <button
            onClick={goNextPage}
            className="absolute right-0 top-0 h-full w-1/3 z-10 flex items-center justify-end pr-2 group"
            aria-label="Következő oldal"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
              <ChevronRight className="h-8 w-8 text-white" />
            </div>
          </button>
        </div>
      ) : (
        /* ── STRIP MODE (vertical scroll) ── */
        <div ref={stripRef} className="flex-1 overflow-y-auto flex flex-col items-center gap-1 py-2">
          {pages.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${i + 1}. oldal`}
              className="max-w-full w-full sm:max-w-2xl object-contain"
              loading="lazy"
            />
          ))}
          {nextChapter && (
            <Button
              onClick={() => { setCurrentChapterId(nextChapter.id); setCurrentPage(0); if (stripRef.current) stripRef.current.scrollTop = 0; }}
              className="mt-6 mb-4"
            >
              Következő fejezet →
            </Button>
          )}
        </div>
      )}

      {/* Bottom bar (single mode) */}
      {readMode === "single" && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-t border-white/10 flex-shrink-0">
          <Button
            variant="ghost" size="sm"
            onClick={goPrevPage}
            disabled={currentPage === 0 && !prevChapter}
            className="text-white hover:bg-white/10 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Előző</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <div className="flex gap-1 hidden sm:flex">
              {Array.from({ length: Math.min(totalPages, 20) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentPage ? "bg-primary" : "bg-white/30 hover:bg-white/60"}`}
                />
              ))}
              {totalPages > 20 && <span className="text-white/40 text-xs ml-1">...</span>}
            </div>
          </div>

          <Button
            variant="ghost" size="sm"
            onClick={goNextPage}
            disabled={currentPage === totalPages - 1 && !nextChapter}
            className="text-white hover:bg-white/10 gap-1"
          >
            <span className="hidden sm:inline">Következő</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MangaReader;
