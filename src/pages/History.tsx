import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { History as HistoryIcon, Play, Clock, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { hu } from "date-fns/locale";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchHistory, WatchHistoryEntry } from "@/hooks/useWatchHistory";
import { useAuth } from "@/hooks/useAuth";

const formatProgress = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const HistoryItem = ({ entry }: { entry: WatchHistoryEntry }) => {
  const progressPercent = entry.duration_seconds
    ? Math.round((entry.progress_seconds / entry.duration_seconds) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-all group"
    >
      {/* Thumbnail */}
      <Link to={`/anime/${entry.anime_id}`} className="shrink-0">
        <div className="relative w-24 sm:w-32 aspect-video rounded-lg overflow-hidden">
          <img
            src={entry.anime?.image_url || "/placeholder.svg"}
            alt={entry.anime?.title || "Anime"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Play icon */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-white fill-current" />
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/anime/${entry.anime_id}`}>
          <h3 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
            {entry.anime?.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground">
          {entry.episode?.episode_number}. rész
          {entry.episode?.title && ` - ${entry.episode.title}`}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatProgress(entry.progress_seconds)}
            {entry.duration_seconds && ` / ${formatProgress(entry.duration_seconds)}`}
          </span>
          <span>
            {formatDistanceToNow(new Date(entry.last_watched_at), {
              addSuffix: true,
              locale: hu,
            })}
          </span>
          {entry.completed && (
            <span className="text-green-500">✓ Befejezve</span>
          )}
        </div>
      </div>

      {/* Continue button */}
      {!entry.completed && (
        <Link to={`/anime/${entry.anime_id}`} className="shrink-0 self-center">
          <Button size="sm" className="gap-2">
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Folytatás</span>
          </Button>
        </Link>
      )}
    </motion.div>
  );
};

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: history, isLoading } = useWatchHistory();

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate("/");
    return null;
  }

  // Group history by time period
  const groupedHistory = useMemo(() => {
    if (!history) return null;

    const groups: {
      today: WatchHistoryEntry[];
      yesterday: WatchHistoryEntry[];
      thisWeek: WatchHistoryEntry[];
      older: WatchHistoryEntry[];
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    history.forEach((entry) => {
      const date = new Date(entry.last_watched_at);
      if (isToday(date)) {
        groups.today.push(entry);
      } else if (isYesterday(date)) {
        groups.yesterday.push(entry);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(entry);
      } else {
        groups.older.push(entry);
      }
    });

    return groups;
  }, [history]);

  const renderGroup = (title: string, items: WatchHistoryEntry[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="space-y-3">
          {items.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <HistoryIcon className="w-7 h-7 text-primary" />
                Nézési előzmények
              </h1>
              <p className="text-muted-foreground">
                A korábban megtekintett epizódjaid
              </p>
            </div>
          </div>

          {/* Content */}
          {isLoading || authLoading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : groupedHistory && history && history.length > 0 ? (
            <div className="space-y-8">
              {renderGroup("Ma", groupedHistory.today)}
              {renderGroup("Tegnap", groupedHistory.yesterday)}
              {renderGroup("Ezen a héten", groupedHistory.thisWeek)}
              {renderGroup("Régebbi", groupedHistory.older)}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Még nincsenek előzményeid</p>
              <p className="text-sm">Kezdj el nézni egy animét!</p>
              <Button
                variant="outline"
                onClick={() => navigate("/browse")}
                className="mt-4"
              >
                Böngészés
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
