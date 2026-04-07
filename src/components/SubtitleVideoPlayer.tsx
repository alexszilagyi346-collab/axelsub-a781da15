import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  SkipBack,
  SkipForward,
  FastForward,
  Settings,
  Server,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useUpdateProgress, useEpisodeProgress } from "@/hooks/useWatchHistory";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SubtitleVideoPlayerProps {
  videoUrl: string;
  title: string;
  posterUrl?: string;
  onClose: () => void;
  subtitleUrl: string;
  backupVideoUrl?: string;
  quality360p?: string;
  quality480p?: string;
  quality720p?: string;
  quality1080p?: string;
  opStart?: string;
  opEnd?: string;
  edStart?: string;
  edEnd?: string;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  nextEpisodeTitle?: string;
  animeId?: string;
  episodeId?: string;
}

type QualityOption = "1080p" | "720p" | "480p" | "360p";
type ServerOption = "primary" | "backup";
type SubtitleSize = "small" | "medium" | "large" | "xlarge";
type SubtitleFormat = "vtt" | "srt" | "ass" | "unknown";

const subtitleSizes: Record<SubtitleSize, string> = {
  small: "3vh",
  medium: "4.5vh",
  large: "6vh",
  xlarge: "7.5vh",
};

const subtitleSizeLabels: Record<SubtitleSize, string> = {
  small: "Kicsi",
  medium: "Közepes",
  large: "Nagy",
  xlarge: "Extra nagy",
};

const parseTimeToSeconds = (timeStr: string | undefined): number | null => {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
};

const getSubtitleFormat = (url: string): SubtitleFormat => {
  const normalizedUrl = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";

  if (normalizedUrl.endsWith(".vtt")) return "vtt";
  if (normalizedUrl.endsWith(".srt")) return "srt";
  if (normalizedUrl.endsWith(".ass")) return "ass";

  return "unknown";
};

const toVttTimestamp = (value: string) => {
  const normalizedValue = value.trim().replace(",", ".");
  const [timePart, millisecondsPart = "000"] = normalizedValue.split(".");
  const timeSegments = timePart.split(":").map((segment) => segment.trim().padStart(2, "0"));

  const safeTime = timeSegments.length === 3
    ? timeSegments.join(":")
    : `00:${timeSegments.join(":")}`;

  return `${safeTime}.${millisecondsPart.padEnd(3, "0").slice(0, 3)}`;
};

const cleanAssText = (text: string) =>
  text
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\N/gi, "\n")
    .replace(/\\n/gi, "\n")
    .replace(/\\h/gi, " ")
    .trim();

const convertSrtToVtt = (content: string) => {
  const blocks = content
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .split(/\n{2,}/);

  const cues = blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean);

      if (!lines.length) return null;

      const timeLineIndex = lines[0].includes("-->") ? 0 : 1;
      const timeLine = lines[timeLineIndex];

      if (!timeLine || !timeLine.includes("-->")) return null;

      const [start, end] = timeLine.split("-->").map((part) => toVttTimestamp(part.trim()));
      const text = lines.slice(timeLineIndex + 1).join("\n").trim();

      if (!text) return null;

      return `${start} --> ${end}\n${text}`;
    })
    .filter((cue): cue is string => Boolean(cue));

  return `WEBVTT\n\n${cues.join("\n\n")}`;
};

const convertAssTimeToVtt = (value: string) => {
  const [hours = "0", minutes = "0", secondsPart = "0"] = value.trim().split(":");
  const [seconds = "0", centiseconds = "0"] = secondsPart.split(".");

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}.${centiseconds.padEnd(2, "0").slice(0, 2)}0`;
};

const convertAssToVtt = (content: string) => {
  const lines = content.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const cues: string[] = [];
  let inEventsSection = false;
  let formatColumns: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("[")) {
      inEventsSection = line.toLowerCase() === "[events]";
      continue;
    }

    if (!inEventsSection) continue;

    if (line.startsWith("Format:")) {
      formatColumns = line
        .replace("Format:", "")
        .split(",")
        .map((column) => column.trim().toLowerCase());
      continue;
    }

    if (!line.startsWith("Dialogue:")) continue;

    const payload = line.replace("Dialogue:", "").trim();
    const fieldCount = formatColumns.length || 10;
    const parts = payload.split(",");

    if (parts.length < fieldCount) continue;

    const values = parts.slice(0, fieldCount - 1);
    values.push(parts.slice(fieldCount - 1).join(","));

    const startIndex = formatColumns.indexOf("start");
    const endIndex = formatColumns.indexOf("end");
    const textIndex = formatColumns.indexOf("text");

    const start = values[startIndex === -1 ? 1 : startIndex];
    const end = values[endIndex === -1 ? 2 : endIndex];
    const text = cleanAssText(values[textIndex === -1 ? values.length - 1 : textIndex] ?? "");

    if (!start || !end || !text) continue;

    cues.push(`${convertAssTimeToVtt(start)} --> ${convertAssTimeToVtt(end)}\n${text}`);
  }

  return `WEBVTT\n\n${cues.join("\n\n")}`;
};

const SubtitleVideoPlayer = ({
  videoUrl,
  title,
  posterUrl,
  onClose,
  subtitleUrl,
  backupVideoUrl,
  quality360p,
  quality480p,
  quality720p,
  quality1080p,
  opStart,
  opEnd,
  edStart,
  edEnd,
  hasNextEpisode,
  onNextEpisode,
  nextEpisodeTitle,
  animeId,
  episodeId,
}: SubtitleVideoPlayerProps) => {
  const { user } = useAuth();
  const updateProgress = useUpdateProgress();
  const { data: savedProgress } = useEpisodeProgress(episodeId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const subtitleObjectUrlRef = useRef<string | null>(null);
  const lastSaveTimeRef = useRef(0);
  const hasRestoredPosition = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const [currentServer, setCurrentServer] = useState<ServerOption>("primary");
  const [currentQuality, setCurrentQuality] = useState<QualityOption>("1080p");
  const [subtitleSize, setSubtitleSize] = useState<SubtitleSize>("medium");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showOpSkip, setShowOpSkip] = useState(false);
  const [showEdSkip, setShowEdSkip] = useState(false);
  const [opSkipped, setOpSkipped] = useState(false);
  const [edSkipped, setEdSkipped] = useState(false);
  const opSkippedRef = useRef(false);
  const edSkippedRef = useRef(false);

  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [resolvedSubtitleUrl, setResolvedSubtitleUrl] = useState<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  // Parse timestamps
  const opStartSec = parseTimeToSeconds(opStart);
  const opEndSec = parseTimeToSeconds(opEnd);
  const edStartSec = parseTimeToSeconds(edStart);
  const edEndSec = parseTimeToSeconds(edEnd);

  // Save progress function
  const saveCurrentProgress = useCallback(
    (completed = false) => {
      if (!videoRef.current || !animeId || !episodeId || !user) return;

      const currentPos = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;

      if (Math.abs(currentPos - lastSaveTimeRef.current) < 5 && !completed) return;

      const isCompleted = completed || currentPos >= videoDuration - 30;

      updateProgress.mutate({
        animeId,
        episodeId,
        progressSeconds: Math.floor(currentPos),
        durationSeconds: Math.floor(videoDuration),
        completed: isCompleted,
      });

      lastSaveTimeRef.current = currentPos;
    },
    [animeId, episodeId, user, updateProgress]
  );

  // Prepare subtitle source (ASS/SRT -> VTT) and clean up object URLs
  useEffect(() => {
    let isCancelled = false;

    const cleanupObjectUrl = () => {
      if (subtitleObjectUrlRef.current) {
        URL.revokeObjectURL(subtitleObjectUrlRef.current);
        subtitleObjectUrlRef.current = null;
      }
    };

    const prepareSubtitleSource = async () => {
      cleanupObjectUrl();

      if (!subtitleUrl) {
        setResolvedSubtitleUrl(null);
        return;
      }

      const format = getSubtitleFormat(subtitleUrl);

      if (format === "vtt" || format === "unknown") {
        setResolvedSubtitleUrl(subtitleUrl);
        return;
      }

      try {
        const response = await fetch(subtitleUrl);

        if (!response.ok) {
          throw new Error(`Subtitle fetch failed: ${response.status}`);
        }

        const subtitleContent = await response.text();
        if (isCancelled) return;

        const vttContent = format === "srt"
          ? convertSrtToVtt(subtitleContent)
          : convertAssToVtt(subtitleContent);

        const objectUrl = URL.createObjectURL(new Blob([vttContent], { type: "text/vtt" }));
        subtitleObjectUrlRef.current = objectUrl;
        setResolvedSubtitleUrl(objectUrl);
      } catch (error) {
        console.error("Subtitle preparation error:", error);
        if (!isCancelled) {
          setResolvedSubtitleUrl(null);
          toast.error("A felirat nem tölthető be ebben a formátumban.");
        }
      }
    };

    prepareSubtitleSource();

    return () => {
      isCancelled = true;
      cleanupObjectUrl();
    };
  }, [subtitleUrl]);

  // Enable subtitle track by default whenever the track changes
  useEffect(() => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video) return;

    const enableSubtitles = () => {
      if (video.textTracks.length > 0) {
        video.textTracks[0].mode = "showing";
      }
    };

    enableSubtitles();
    video.addEventListener("loadedmetadata", enableSubtitles);
    track?.addEventListener("load", enableSubtitles);

    return () => {
      video.removeEventListener("loadedmetadata", enableSubtitles);
      track?.removeEventListener("load", enableSubtitles);
    };
  }, [resolvedSubtitleUrl]);

  // Restore saved position
  useEffect(() => {
    if (savedProgress && videoRef.current && !hasRestoredPosition.current) {
      const video = videoRef.current;
      const handleCanPlay = () => {
        if (!hasRestoredPosition.current && savedProgress.progress_seconds > 0) {
          video.currentTime = savedProgress.progress_seconds;
          hasRestoredPosition.current = true;
        }
      };
      video.addEventListener("canplay", handleCanPlay, { once: true });
      return () => video.removeEventListener("canplay", handleCanPlay);
    }
  }, [savedProgress]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!animeId || !episodeId || !user) return;

    const interval = setInterval(() => {
      if (isPlaying) {
        saveCurrentProgress();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [animeId, episodeId, user, isPlaying, saveCurrentProgress]);

  const handleClose = () => {
    saveCurrentProgress();
    onClose();
  };

  const getCurrentVideoUrl = useCallback(() => {
    const baseUrl = currentServer === "backup" && backupVideoUrl ? backupVideoUrl : videoUrl;

    // Use specific quality URL if available, otherwise fall back to base URL
    switch (currentQuality) {
      case "1080p":
        return quality1080p || baseUrl;
      case "720p":
        return quality720p || baseUrl;
      case "480p":
        return quality480p || baseUrl;
      case "360p":
        return quality360p || baseUrl;
      default:
        return baseUrl;
    }
  }, [currentServer, currentQuality, videoUrl, backupVideoUrl, quality360p, quality480p, quality720p, quality1080p]);

  // All quality options are always available
  const availableQualities: QualityOption[] = ["1080p", "720p", "480p", "360p"];
  
  // Track which qualities have dedicated URLs
  const qualityHasUrl: Record<QualityOption, boolean> = {
    "1080p": !!quality1080p,
    "720p": !!quality720p,
    "480p": !!quality480p,
    "360p": !!quality360p,
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      if (opStartSec !== null && opEndSec !== null && !opSkippedRef.current) {
        setShowOpSkip(time >= opStartSec && time <= opEndSec);
      }

      if (edStartSec !== null && edEndSec !== null && !edSkippedRef.current) {
        setShowEdSkip(time >= edStartSec && time <= edEndSec);
      }
    };

    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => setIsBuffering(false);
    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
      saveCurrentProgress();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      saveCurrentProgress(true);
      if (hasNextEpisode && onNextEpisode) {
        setShowNextEpisode(true);
        setNextEpisodeCountdown(10);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("canplaythrough", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("canplaythrough", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [opStartSec, opEndSec, edStartSec, edEndSec, opSkipped, edSkipped, hasNextEpisode, onNextEpisode, saveCurrentProgress]);

  // Next episode countdown
  useEffect(() => {
    if (showNextEpisode && autoPlayEnabled && nextEpisodeCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setNextEpisodeCountdown((prev) => {
          if (prev <= 1) {
            if (onNextEpisode) onNextEpisode();
            setShowNextEpisode(false);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showNextEpisode, autoPlayEnabled, onNextEpisode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const prevServerRef = useRef<ServerOption | null>(null);
  const prevQualityRef = useRef<QualityOption | null>(null);
  const prevSourceUrlRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  // Initial video load
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInitialMount.current) return;

    isInitialMount.current = false;
    prevServerRef.current = currentServer;
    prevQualityRef.current = currentQuality;

    const initialUrl = getCurrentVideoUrl();
    prevSourceUrlRef.current = initialUrl;

    const handleInitialLoaded = () => {
      setIsBuffering(false);
      video.removeEventListener("loadeddata", handleInitialLoaded);
    };

    const handleInitialError = () => {
      console.error("Initial video load error");
      setIsBuffering(false);
      toast.error("A videó nem tölthető be. Ellenőrizd a linket.");
      video.removeEventListener("error", handleInitialError);
    };

    setIsBuffering(true);
    video.addEventListener("loadeddata", handleInitialLoaded);
    video.addEventListener("error", handleInitialError);
    video.src = initialUrl;
    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleInitialLoaded);
      video.removeEventListener("error", handleInitialError);
    };
  }, [currentQuality, currentServer, getCurrentVideoUrl]);

  // Handle quality/server changes (not initial mount)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const newUrl = getCurrentVideoUrl();

    // Skip if this is initial mount or no change
    if (isInitialMount.current) return;
    if (
      prevServerRef.current === currentServer &&
      prevQualityRef.current === currentQuality &&
      prevSourceUrlRef.current === newUrl
    ) {
      return;
    }

    prevServerRef.current = currentServer;
    prevQualityRef.current = currentQuality;
    prevSourceUrlRef.current = newUrl;

    const currentPos = video.currentTime;
    const wasPlaying = !video.paused;

    setIsBuffering(true);
    video.src = newUrl;

    const handleLoaded = () => {
      video.currentTime = currentPos;
      setIsBuffering(false);
      if (wasPlaying) {
        video.play().catch((err) => {
          console.error("Play error after quality change:", err);
          setIsBuffering(false);
        });
      }
      video.removeEventListener("loadeddata", handleLoaded);
    };
    
    const handleError = () => {
      console.error("Video load error");
      setIsBuffering(false);
      toast.error("Hiba a videó betöltésekor. Próbálj másik minőséget.");
      video.removeEventListener("error", handleError);
    };
    
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("error", handleError);
    video.load();
    
    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
  }, [currentServer, currentQuality, getCurrentVideoUrl]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettingsMenu(false);
        setShowServerMenu(false);
      }
    }, 3000);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        setIsBuffering(true);
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      setIsBuffering(false);
      console.error("Video play failed", err);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (isFullscreen) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const skipOpening = () => {
    if (!videoRef.current || opEndSec === null) return;
    videoRef.current.currentTime = opEndSec;
    opSkippedRef.current = true;
    setOpSkipped(true);
    setShowOpSkip(false);
  };

  const skipEnding = () => {
    if (!videoRef.current || edEndSec === null) return;
    videoRef.current.currentTime = edEndSec;
    edSkippedRef.current = true;
    setEdSkipped(true);
    setShowEdSkip(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black subtitle-video-player"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={() => {
          setShowSettingsMenu(false);
          setShowServerMenu(false);
        }}
      >
        {/* Subtitle "burned-in" effect style */}
        <style>{`
          video::cue {
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${subtitleSizes[subtitleSize]};
            font-weight: bold;
            color: #ffffff;
            background-color: transparent;
            text-shadow: 
              -2px -2px 0 #000,
              2px -2px 0 #000,
              -2px 2px 0 #000,
              2px 2px 0 #000,
              -2px 0 0 #000,
              2px 0 0 #000,
              0 -2px 0 #000,
              0 2px 0 #000,
              -1px -1px 2px rgba(0,0,0,0.8),
              1px -1px 2px rgba(0,0,0,0.8),
              -1px 1px 2px rgba(0,0,0,0.8),
              1px 1px 2px rgba(0,0,0,0.8);
            -webkit-text-stroke: 1.5px #000;
            paint-order: stroke fill;
            padding: 0;
            line-height: 1.3;
          }
          
          video::-webkit-media-text-track-container {
            overflow: visible !important;
            transform: translateY(-10%) !important;
          }
          
          video::-webkit-media-text-track-display {
            overflow: visible !important;
          }
        `}</style>

        {/* Close Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
          className="absolute top-4 right-4 z-50"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-primary hover:text-primary-foreground backdrop-blur-sm"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
          className="absolute top-4 left-4 z-50"
        >
          <h2 className="text-xl font-bold text-white drop-shadow-lg">{title}</h2>
          <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
            <Type className="h-3 w-3" />
            KÜLSŐ FELIRAT MÓD
          </span>
        </motion.div>

        {/* Skip OP Button */}
        <AnimatePresence>
          {showOpSkip && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute bottom-32 right-6 z-50"
            >
              <Button
                onClick={skipOpening}
                className="bg-primary/90 hover:bg-primary text-primary-foreground font-semibold gap-2 backdrop-blur-sm shadow-lg shadow-primary/30"
              >
                <FastForward className="h-4 w-4" />
                Opening átugrása
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip ED Button */}
        <AnimatePresence>
          {showEdSkip && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute bottom-32 right-6 z-50"
            >
              <Button
                onClick={skipEnding}
                className="bg-primary/90 hover:bg-primary text-primary-foreground font-semibold gap-2 backdrop-blur-sm shadow-lg shadow-primary/30"
              >
                <FastForward className="h-4 w-4" />
                Ending átugrása
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Episode Panel */}
        <AnimatePresence>
          {showNextEpisode && hasNextEpisode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 border border-border shadow-2xl">
                <h3 className="text-2xl font-bold text-foreground mb-2">Következő epizód</h3>
                {nextEpisodeTitle && <p className="text-muted-foreground mb-6">{nextEpisodeTitle}</p>}

                {autoPlayEnabled && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Automatikus lejátszás</span>
                      <span className="text-primary font-bold text-xl">{nextEpisodeCountdown}s</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "100%" }}
                        animate={{ width: `${(nextEpisodeCountdown / 10) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
                    onClick={() => {
                      if (onNextEpisode) onNextEpisode();
                      setShowNextEpisode(false);
                    }}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Lejátszás most
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setAutoPlayEnabled(!autoPlayEnabled);
                        if (!autoPlayEnabled) {
                          setNextEpisodeCountdown(10);
                        }
                      }}
                    >
                      {autoPlayEnabled ? "Auto-play kikapcs." : "Auto-play bekapcs."}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setShowNextEpisode(false);
                        handleClose();
                      }}
                    >
                      Bezárás
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video with subtitles */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={posterUrl}
          onClick={togglePlay}
          playsInline
          preload="auto"
        >
          {resolvedSubtitleUrl && (
            <track
              key={resolvedSubtitleUrl}
              ref={trackRef}
              kind="subtitles"
              src={resolvedSubtitleUrl}
              srcLang="hu"
              label="Magyar"
              default
            />
          )}
        </video>

        {/* Center Play/Pause Button */}
        <AnimatePresence>
          {(!isPlaying || isBuffering) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {isBuffering ? (
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-24 h-24 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto shadow-2xl shadow-primary/50"
                  onClick={togglePlay}
                >
                  <Play className="h-12 w-12 text-primary-foreground ml-2" fill="currentColor" />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
          className="absolute bottom-0 left-0 right-0 z-50"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

          <div className="relative px-6 pb-6 pt-16">
            {/* Progress Bar */}
            <div className="mb-4 group">
              <div className="relative h-1 group-hover:h-2 transition-all duration-200 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  style={{ width: `${progress + 10}%` }}
                />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-purple-400 rounded-full"
                  style={{ width: `${progress}%` }}
                />
                {opStartSec !== null && opEndSec !== null && duration > 0 && (
                  <div
                    className="absolute inset-y-0 bg-cyan-500/50"
                    style={{
                      left: `${(opStartSec / duration) * 100}%`,
                      width: `${((opEndSec - opStartSec) / duration) * 100}%`,
                    }}
                  />
                )}
                {edStartSec !== null && edEndSec !== null && duration > 0 && (
                  <div
                    className="absolute inset-y-0 bg-cyan-500/50"
                    style={{
                      left: `${(edStartSec / duration) * 100}%`,
                      width: `${((edEndSec - edStartSec) / duration) * 100}%`,
                    }}
                  />
                )}
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                {/* Play/Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center backdrop-blur-sm transition-colors"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4 md:h-5 md:w-5 text-white ml-0.5" fill="currentColor" />
                  )}
                </motion.button>

                {/* Skip Back */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                  onClick={() => skip(-10)}
                >
                  <SkipBack className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </motion.button>

                {/* Skip Forward */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                  onClick={() => skip(10)}
                >
                  <SkipForward className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </motion.button>

                {/* Volume */}
                <div className="hidden sm:flex items-center gap-2 group/volume">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    ) : (
                      <Volume2 className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    )}
                  </motion.button>
                  <div className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-300">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Time */}
                <span className="text-white text-xs md:text-sm font-medium tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                {/* Server Selector */}
                {backupVideoUrl && (
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowServerMenu(!showServerMenu);
                        setShowSettingsMenu(false);
                      }}
                    >
                      <Server className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </motion.button>

                    <AnimatePresence>
                      {showServerMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={`px-4 py-2 text-sm w-full text-left hover:bg-white/10 transition-colors flex items-center gap-2 ${
                              currentServer === "primary" ? "text-primary" : "text-white"
                            }`}
                            onClick={() => {
                              setCurrentServer("primary");
                              setShowServerMenu(false);
                            }}
                          >
                            {currentServer === "primary" && <span className="w-2 h-2 rounded-full bg-primary" />}
                            Elsődleges szerver
                          </button>
                          <button
                            className={`px-4 py-2 text-sm w-full text-left hover:bg-white/10 transition-colors flex items-center gap-2 ${
                              currentServer === "backup" ? "text-primary" : "text-white"
                            }`}
                            onClick={() => {
                              setCurrentServer("backup");
                              setShowServerMenu(false);
                            }}
                          >
                            {currentServer === "backup" && <span className="w-2 h-2 rounded-full bg-primary" />}
                            Tartalék szerver
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Settings (Quality + Subtitle Size) */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettingsMenu(!showSettingsMenu);
                      setShowServerMenu(false);
                    }}
                  >
                    <Settings className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </motion.button>

                  <AnimatePresence>
                    {showSettingsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10 min-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Quality Section */}
                        <div className="px-3 py-2 border-b border-white/10">
                          <span className="text-xs text-muted-foreground">Minőség</span>
                        </div>
                        {availableQualities.map((quality) => (
                          <button
                            key={quality}
                            className={`px-4 py-2 text-sm w-full text-left hover:bg-white/10 transition-colors flex items-center gap-2 ${
                              currentQuality === quality ? "text-primary" : "text-white"
                            }`}
                            onClick={() => setCurrentQuality(quality)}
                          >
                            {currentQuality === quality && <span className="w-2 h-2 rounded-full bg-primary" />}
                            <span>{quality}</span>
                            {!qualityHasUrl[quality] && (
                              <span className="text-xs text-muted-foreground ml-auto">(alap)</span>
                            )}
                          </button>
                        ))}

                        {/* Subtitle Size Section */}
                        <div className="px-3 py-2 border-y border-white/10 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Type className="h-3 w-3" />
                            Felirat méret
                          </span>
                        </div>
                        {(Object.keys(subtitleSizes) as SubtitleSize[]).map((size) => (
                          <button
                            key={size}
                            className={`px-4 py-2 text-sm w-full text-left hover:bg-white/10 transition-colors flex items-center gap-2 ${
                              subtitleSize === size ? "text-primary" : "text-white"
                            }`}
                            onClick={() => setSubtitleSize(size)}
                          >
                            {subtitleSize === size && <span className="w-2 h-2 rounded-full bg-primary" />}
                            {subtitleSizeLabels[size]}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fullscreen */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  ) : (
                    <Maximize className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubtitleVideoPlayer;
