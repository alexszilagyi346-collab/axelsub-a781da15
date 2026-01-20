import { useState } from "react";
import { Plus, Check, Clock, Eye, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWatchlistStatus, useUpdateWatchlistStatus, WatchlistStatus, watchlistStatusLabels } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  animeId: string;
  className?: string;
  variant?: "default" | "compact";
}

const statusIcons: Record<WatchlistStatus, React.ReactNode> = {
  planned: <Clock className="w-4 h-4" />,
  watching: <Eye className="w-4 h-4" />,
  completed: <Check className="w-4 h-4" />,
  dropped: <X className="w-4 h-4" />,
};

const WatchlistButton = ({ animeId, className, variant = "default" }: WatchlistButtonProps) => {
  const { user } = useAuth();
  const { data: watchlistEntry, isLoading } = useWatchlistStatus(animeId);
  const updateStatus = useUpdateWatchlistStatus();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = async (status: WatchlistStatus | null) => {
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "A listához adáshoz jelentkezz be.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({ animeId, status });
      toast({
        title: status 
          ? `${watchlistStatusLabels[status]} listára téve` 
          : "Eltávolítva a listáról",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Hiba történt",
        variant: "destructive",
      });
    }
  };

  const currentStatus = watchlistEntry?.status as WatchlistStatus | undefined;

  if (variant === "compact") {
    return (
      <div className={cn("relative", className)}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || updateStatus.isPending}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
            currentStatus 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          whileTap={{ scale: 0.95 }}
        >
          {currentStatus ? statusIcons[currentStatus] : <Plus className="w-4 h-4" />}
          <span>{currentStatus ? watchlistStatusLabels[currentStatus] : "Listához"}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              {(Object.keys(watchlistStatusLabels) as WatchlistStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted",
                    currentStatus === status && "bg-primary/10 text-primary"
                  )}
                >
                  {statusIcons[status]}
                  <span>{watchlistStatusLabels[status]}</span>
                </button>
              ))}
              {currentStatus && (
                <>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => handleStatusChange(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Eltávolítás</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || updateStatus.isPending}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
          currentStatus 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        whileTap={{ scale: 0.95 }}
      >
        {currentStatus ? statusIcons[currentStatus] : <Plus className="w-5 h-5" />}
        <span className="font-medium">{currentStatus ? watchlistStatusLabels[currentStatus] : "Listához adás"}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {(Object.keys(watchlistStatusLabels) as WatchlistStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                    currentStatus === status && "bg-primary/10 text-primary"
                  )}
                >
                  {statusIcons[status]}
                  <span>{watchlistStatusLabels[status]}</span>
                  {currentStatus === status && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
              {currentStatus && (
                <>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => handleStatusChange(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Eltávolítás a listáról</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WatchlistButton;
