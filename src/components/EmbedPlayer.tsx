import { useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmbedPlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Detects if a URL is an embeddable video from Indavideo or Videa.
 */
export const isEmbedUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("indavideo.hu") ||
    lower.includes("videa.hu") ||
    lower.includes("embed.indavideo.hu") ||
    lower.includes("videa.hu/player")
  );
};

/**
 * Converts a regular Indavideo/Videa URL to its embed form.
 */
export const toEmbedUrl = (url: string): string => {
  // Already an embed URL
  if (url.includes("/embed/") || url.includes("/player")) {
    return url;
  }

  // Indavideo: https://indavideo.hu/video/XXXXX → https://embed.indavideo.hu/player/video/XXXXX
  const indaMatch = url.match(/indavideo\.hu\/video\/([^\/?#]+)/);
  if (indaMatch) {
    return `https://embed.indavideo.hu/player/video/${indaMatch[1]}`;
  }

  // Videa: https://videa.hu/videok/XXXXX-ID → https://videa.hu/player?v=ID
  const videaMatch = url.match(/videa\.hu\/videok\/[^?#]*?-([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (videaMatch) {
    return `https://videa.hu/player?v=${videaMatch[1]}`;
  }

  // If it's already a videa player URL or we can't parse, return as-is
  return url;
};

const EmbedPlayer = ({ videoUrl, title, onClose }: EmbedPlayerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const embedSrc = toEmbedUrl(videoUrl);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        <div className="flex items-center justify-between p-3 bg-black/80">
          <span className="text-sm text-white/80 truncate">{title}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={toggleFullscreen}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <iframe
          src={embedSrc}
          className="flex-1 w-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title={title || "Video Player"}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        src={embedSrc}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        title={title || "Video Player"}
      />
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmbedPlayer;
