import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_watch_time_minutes: number | null;
  created_at: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
};

export const useUpdateProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useWatchStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["watch-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get total episodes watched
      const { data: watchHistory, error: historyError } = await supabase
        .from("watch_history")
        .select("completed, duration_seconds, anime_id")
        .eq("user_id", user.id);

      if (historyError) throw historyError;

      // Get favorites count
      const { count: favoritesCount, error: favError } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (favError) throw favError;

      // Get watchlist stats
      const { data: watchlist, error: watchlistError } = await supabase
        .from("watchlist")
        .select("status")
        .eq("user_id", user.id);

      if (watchlistError) throw watchlistError;

      // Calculate stats
      const completedEpisodes = watchHistory?.filter(h => h.completed).length || 0;
      const totalWatchTimeMinutes = Math.round(
        (watchHistory?.reduce((acc, h) => acc + (h.duration_seconds || 0), 0) || 0) / 60
      );
      const uniqueAnimes = new Set(watchHistory?.map(h => h.anime_id) || []).size;
      const completedAnimes = watchlist?.filter(w => w.status === "completed").length || 0;

      return {
        completedEpisodes,
        totalWatchTimeMinutes,
        uniqueAnimes,
        completedAnimes,
        favoritesCount: favoritesCount || 0,
        watchlistCount: watchlist?.length || 0,
        watchingCount: watchlist?.filter(w => w.status === "watching").length || 0,
        plannedCount: watchlist?.filter(w => w.status === "planned").length || 0,
      };
    },
    enabled: !!user,
  });
};

export const useUploadAvatar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("animek")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("animek")
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
