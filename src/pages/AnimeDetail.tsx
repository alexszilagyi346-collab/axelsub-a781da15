import { useParams, Link } from "react-router-dom";
import { extractIdFromSlug } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import SubtitleVideoPlayer from "@/components/SubtitleVideoPlayer";
import EmbedPlayer, { isEmbedUrl } from "@/components/EmbedPlayer";
import EpisodeList, { Episode } from "@/components/EpisodeList";
import FavoriteButton from "@/components/FavoriteButton";
import WatchlistButton from "@/components/WatchlistButton";
import RatingStars from "@/components/RatingStars";
import CommentSection from "@/components/CommentSection";
import SimilarAnimes from "@/components/SimilarAnimes";
import SubscribeButton from "@/components/SubscribeButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, ArrowLeft, Calendar, Tag, Type, ChevronLeft, ChevronRight, Monitor, Film } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOpenGraph } from "@/hooks/useOpenGraph";
import type { Anime } from "@/types/anime";

const AnimeDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const id = slug ? extractIdFromSlug(slug) : undefined;
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", id],
    queryFn: async (): Promise<Anime | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const prevEpisodeInfo = useMemo(() => {
    if (!selectedEpisode || episodes.length === 0) return null;
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    if (currentIndex <= 0) return null;
    return episodes[currentIndex - 1];
  }, [selectedEpisode, episodes]);

  const nextEpisodeInfo = useMemo(() => {
    if (!selectedEpisode || episodes.length === 0) return null;
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    if (currentIndex === -1 || currentIndex >= episodes.length - 1) return null;
    const nextEp = episodes[currentIndex + 1];
    return {
      episode: nextEp,
      title: `${nextEp.episode_number}. epizód${nextEp.title ? `: ${nextEp.title}` : ""}`
    };
  }, [selectedEpisode, episodes]);

  const handlePrevEpisode = () => {
    if (prevEpisodeInfo) {
      setSelectedEpisode(prevEpisodeInfo);
      setIsPlaying(true);
    }
  };

  const handleNextEpisode = () => {
    if (nextEpisodeInfo) {
      setSelectedEpisode(nextEpisodeInfo.episode);
      setIsPlaying(true);
    }
  };

  useOpenGraph({
    title: anime?.title,
    description: anime?.description,
    image: anime?.image_url,
    url: window.location.href,
    type: "video.other",
  });

  const hasExternalSubtitle = selectedEpisode?.subtitle_url && selectedEpisode?.subtitle_type === "external";
  const currentVideoUrl = selectedEpisode?.video_url || anime?.video_url || "";
  const isEmbed = isEmbedUrl(currentVideoUrl);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="flex gap-8">
              <Skeleton className="w-56 h-80 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-4 pt-4">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-48" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Anime nem található
            </h1>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza a főoldalra
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const playerProps = {
    videoUrl: selectedEpisode?.video_url || anime.video_url!,
    title: selectedEpisode
      ? `${anime.title} - ${selectedEpisode.episode_number}. epizód${selectedEpisode.title ? `: ${selectedEpisode.title}` : ""}`
      : anime.title,
    posterUrl: anime.image_url || undefined,
    onClose: () => setIsPlaying(false),
    backupVideoUrl: selectedEpisode?.backup_video_url || undefined,
    quality360p: selectedEpisode?.quality_360p || undefined,
    quality480p: selectedEpisode?.quality_480p || undefined,
    quality720p: selectedEpisode?.quality_720p || undefined,
    quality1080p: selectedEpisode?.quality_1080p || undefined,
    opStart: selectedEpisode?.op_start || undefined,
    opEnd: selectedEpisode?.op_end || undefined,
    edStart: selectedEpisode?.ed_start || undefined,
    edEnd: selectedEpisode?.ed_end || undefined,
    hasNextEpisode: !!nextEpisodeInfo,
    onNextEpisode: handleNextEpisode,
    nextEpisodeTitle: nextEpisodeInfo?.title,
    animeId: anime.id,
    episodeId: selectedEpisode?.id,
  };

  const posterUrl = anime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative w-full overflow-hidden">
          {/* Blurred background */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
          <div className="absolute inset-0 backdrop-blur-2xl" />
          <div className="absolute inset-0 bg-black/60" />

          {/* Back button */}
          <div className="relative z-10 container mx-auto px-4 pt-6">
            <Link to="/">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Vissza
              </Button>
            </Link>
          </div>

          {/* Card layout */}
          <div className="relative z-10 container mx-auto px-4 py-8 pb-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">

              {/* Poster */}
              <div className="flex-shrink-0 w-48 md:w-56 lg:w-64 mx-auto md:mx-0">
                <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
                  <img
                    src={posterUrl}
                    alt={anime.title}
                    className="w-full aspect-[3/4] object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                  {anime.title}
                </h1>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  {anime.genre && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white/90 border border-white/20">
                      <Tag className="h-3.5 w-3.5" />
                      {anime.genre}
                    </span>
                  )}
                  {anime.year && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white/90 border border-white/20">
                      <Calendar className="h-3.5 w-3.5" />
                      {anime.year}
                    </span>
                  )}
                  {anime.episodes_count != null && anime.episodes_count > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white/90 border border-white/20">
                      <Film className="h-3.5 w-3.5" />
                      {anime.episodes_count} epizód
                    </span>
                  )}
                  {anime.status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      anime.status === "completed"
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : anime.status === "ongoing"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    }`}>
                      {anime.status === "completed" ? "Befejezett" :
                       anime.status === "ongoing" ? "Folyamatban" : "Beharangozott"}
                    </span>
                  )}
                  {selectedEpisode?.subtitle_url && selectedEpisode?.subtitle_type === "external" && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Type className="h-3 w-3" />
                      Külső felirat
                    </span>
                  )}
                </div>

                {/* Description */}
                {anime.description && (
                  <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6 max-w-2xl line-clamp-3">
                    {anime.description}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  {(selectedEpisode?.video_url || anime.video_url) ? (
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-lg shadow-primary/30"
                      onClick={() => setIsPlaying(true)}
                    >
                      <Play className="h-5 w-5 fill-current" />
                      {selectedEpisode ? `${selectedEpisode.episode_number}. epizód` : "Megtekintés"}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-white/10 text-white/50 font-semibold gap-2"
                      disabled
                    >
                      <Play className="h-5 w-5" />
                      Válassz epizódot
                    </Button>
                  )}

                  <FavoriteButton animeId={anime.id} size="lg" showLabel />
                  <WatchlistButton animeId={anime.id} />
                  <SubscribeButton animeId={anime.id} showLabel />
                </div>

                {user && (
                  <div className="flex justify-center md:justify-start">
                    <RatingStars animeId={anime.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player + Episodes */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              {isPlaying && (selectedEpisode?.video_url || anime.video_url) ? (
                <div className="rounded-xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/5">
                  {isEmbed ? (
                    <EmbedPlayer
                      videoUrl={currentVideoUrl}
                      title={playerProps.title}
                      onClose={() => setIsPlaying(false)}
                    />
                  ) : hasExternalSubtitle ? (
                    <SubtitleVideoPlayer {...playerProps} subtitleUrl={selectedEpisode!.subtitle_url!} />
                  ) : (
                    <VideoPlayer {...playerProps} subtitleUrl={selectedEpisode?.subtitle_url || undefined} />
                  )}
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden border border-border/30 aspect-video flex items-center justify-center bg-muted/30 cursor-pointer group"
                  onClick={() => {
                    if (selectedEpisode?.video_url || anime.video_url) setIsPlaying(true);
                  }}
                >
                  <div className="text-center">
                    <Play className="h-16 w-16 text-muted-foreground/50 group-hover:text-primary transition-colors mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {selectedEpisode ? `${selectedEpisode.episode_number}. epizód` : "Válassz egy epizódot a lejátszáshoz"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              {selectedEpisode && (
                <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      Most nézed: {selectedEpisode.episode_number}. rész
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-1"
                      disabled={!prevEpisodeInfo}
                      onClick={handlePrevEpisode}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Előző rész
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-1"
                      disabled={!nextEpisodeInfo}
                      onClick={handleNextEpisode}
                    >
                      Következő rész
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/30 bg-card/50 p-4 max-h-[50vh] overflow-y-auto">
                <EpisodeList
                  animeId={anime.id}
                  onSelectEpisode={(episode) => {
                    setSelectedEpisode(episode);
                    setIsPlaying(true);
                  }}
                  selectedEpisodeId={selectedEpisode?.id}
                  onEpisodesLoaded={setEpisodes}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Leírás</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {anime.description || "Nincs elérhető leírás ehhez az animéhez."}
          </p>
        </div>

        <SimilarAnimes currentAnimeId={anime.id} genre={anime.genre} />

        <div className="container mx-auto px-4 py-8">
          <CommentSection
            animeId={anime.id}
            episodeId={selectedEpisode?.id}
          />
        </div>
      </main>
    </div>
  );
};

export default AnimeDetail;
