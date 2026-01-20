import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WatchHistoryEntry {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
  anime?: {
    id: string;
    title: string;
    image_url: string | null;
    genre: string | null;
  };
  episode?: {
    id: string;
    episode_number: number;
    title: string | null;
  };
}

export const useWatchHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["watch-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("watch_history")
        .select(`
          *,
          anime:animes(id, title, image_url, genre),
          episode:episodes(id, episode_number, title)
        `)
        .eq("user_id", user.id)
        .order("last_watched_at", { ascending: false });

      if (error) throw error;
      return data as WatchHistoryEntry[];
    },
    enabled: !!user,
  });
};

export const useContinueWatching = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["continue-watching", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("watch_history")
        .select(`
          *,
          anime:animes(id, title, image_url, genre),
          episode:episodes(id, episode_number, title)
        `)
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("last_watched_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as WatchHistoryEntry[];
    },
    enabled: !!user,
  });
};

export const useEpisodeProgress = (episodeId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["episode-progress", user?.id, episodeId],
    queryFn: async () => {
      if (!user || !episodeId) return null;
      
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!episodeId,
  });
};

export const useUpdateProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      animeId,
      episodeId,
      progressSeconds,
      durationSeconds,
      completed = false,
    }: {
      animeId: string;
      episodeId: string;
      progressSeconds: number;
      durationSeconds?: number;
      completed?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("watch_history")
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            episode_id: episodeId,
            progress_seconds: progressSeconds,
            duration_seconds: durationSeconds,
            completed,
            last_watched_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,episode_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["continue-watching"] });
      queryClient.invalidateQueries({ queryKey: ["episode-progress"] });
    },
  });
};

export const useMarkAsWatched = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      animeId,
      episodeId,
    }: {
      animeId: string;
      episodeId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("watch_history")
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            episode_id: episodeId,
            completed: true,
            last_watched_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,episode_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["continue-watching"] });
    },
  });
};
