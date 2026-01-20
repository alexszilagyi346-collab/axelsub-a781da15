import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import EpisodeList, { Episode } from "@/components/EpisodeList";
import FavoriteButton from "@/components/FavoriteButton";
import WatchlistButton from "@/components/WatchlistButton";
import RatingStars from "@/components/RatingStars";
import CommentSection from "@/components/CommentSection";
import SimilarAnimes from "@/components/SimilarAnimes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, ArrowLeft, Calendar, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Anime } from "@/types/anime";

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>();
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

  // Calculate next episode info
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

  const handleNextEpisode = () => {
    if (nextEpisodeInfo) {
      setSelectedEpisode(nextEpisodeInfo.episode);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Skeleton className="w-full h-[60vh] rounded-lg" />
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Video Player */}
      {isPlaying && (selectedEpisode?.video_url || anime.video_url) && (
        <VideoPlayer
          videoUrl={selectedEpisode?.video_url || anime.video_url!}
          title={selectedEpisode ? `${anime.title} - ${selectedEpisode.episode_number}. epizód${selectedEpisode.title ? `: ${selectedEpisode.title}` : ""}` : anime.title}
          posterUrl={anime.image_url || undefined}
          onClose={() => setIsPlaying(false)}
          // New intelligent player props
          backupVideoUrl={selectedEpisode?.backup_video_url || undefined}
          quality360p={selectedEpisode?.quality_360p || undefined}
          quality480p={selectedEpisode?.quality_480p || undefined}
          quality720p={selectedEpisode?.quality_720p || undefined}
          quality1080p={selectedEpisode?.quality_1080p || undefined}
          opStart={selectedEpisode?.op_start || undefined}
          opEnd={selectedEpisode?.op_end || undefined}
          edStart={selectedEpisode?.ed_start || undefined}
          edEnd={selectedEpisode?.ed_end || undefined}
          subtitleUrl={selectedEpisode?.subtitle_url || undefined}
          // Next episode props
          hasNextEpisode={!!nextEpisodeInfo}
          onNextEpisode={handleNextEpisode}
          nextEpisodeTitle={nextEpisodeInfo?.title}
          // Watch history props
          animeId={anime.id}
          episodeId={selectedEpisode?.id}
        />
      )}
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${anime.image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"})` 
            }}
          />
          <div className="absolute inset-0 hero-gradient" />
          
          <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-12">
            {/* Back Button */}
            <Link to="/" className="absolute top-8 left-4">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Vissza
              </Button>
            </Link>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {anime.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-6 mb-6 text-muted-foreground">
              {anime.genre && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>{anime.genre}</span>
                </div>
              )}
              {anime.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{anime.year}</span>
                </div>
              )}
              {anime.status && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  anime.status === "completed" ? "bg-green-500/20 text-green-400" :
                  anime.status === "ongoing" ? "bg-blue-500/20 text-blue-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {anime.status === "completed" ? "Befejezett" :
                   anime.status === "ongoing" ? "Folyamatban" : "Beharangozott"}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              {(selectedEpisode?.video_url || anime.video_url) ? (
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
                  onClick={() => setIsPlaying(true)}
                >
                  <Play className="h-5 w-5 fill-current" />
                  {selectedEpisode ? `${selectedEpisode.episode_number}. epizód lejátszása` : "Megtekintés"}
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="bg-muted text-muted-foreground font-semibold gap-2"
                  disabled
                >
                  <Play className="h-5 w-5" />
                  Válassz egy epizódot
                </Button>
              )}
              
              {/* Favorite Button */}
              <FavoriteButton animeId={anime.id} size="lg" showLabel />
              
              {/* Watchlist Button */}
              <WatchlistButton animeId={anime.id} />
            </div>
            
            {/* Rating Stars - for logged in users */}
            {user && (
              <div className="mt-4">
                <RatingStars animeId={anime.id} />
              </div>
            )}
          </div>
        </div>

        {/* Episodes Section */}
        <div className="container mx-auto px-4 py-8">
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

        {/* Description Section */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Leírás</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {anime.description || "Nincs elérhető leírás ehhez az animéhez."}
          </p>
        </div>
        
        {/* Similar Animes Section */}
        <SimilarAnimes currentAnimeId={anime.id} genre={anime.genre} />
        
        {/* Comments Section */}
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
