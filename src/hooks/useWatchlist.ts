import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type WatchlistStatus = "planned" | "watching" | "completed" | "dropped";

export interface WatchlistEntry {
  id: string;
  user_id: string;
  anime_id: string;
  status: WatchlistStatus;
  created_at: string;
  updated_at: string;
  anime?: {
    id: string;
    title: string;
    image_url: string | null;
    genre: string | null;
  };
}

export const useWatchlist = (status?: WatchlistStatus) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["watchlist", user?.id, status],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("watchlist")
        .select(`
          *,
          anime:animes(id, title, image_url, genre)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WatchlistEntry[];
    },
    enabled: !!user,
  });
};

export const useWatchlistStatus = (animeId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["watchlist-status", user?.id, animeId],
    queryFn: async () => {
      if (!user || !animeId) return null;
      
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .eq("anime_id", animeId)
        .maybeSingle();

      if (error) throw error;
      return data as WatchlistEntry | null;
    },
    enabled: !!user && !!animeId,
  });
};

export const useUpdateWatchlistStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      animeId,
      status,
    }: {
      animeId: string;
      status: WatchlistStatus | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (status === null) {
        // Remove from watchlist
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("anime_id", animeId);
        if (error) throw error;
        return { action: "removed" as const };
      }

      // Upsert status
      const { data, error } = await supabase
        .from("watchlist")
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            status,
          },
          {
            onConflict: "user_id,anime_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return { action: "updated" as const, data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist-status", user?.id, variables.animeId] });
    },
  });
};

export const watchlistStatusLabels: Record<WatchlistStatus, string> = {
  planned: "Tervezett",
  watching: "Nézés alatt",
  completed: "Befejezett",
  dropped: "Elejtett",
};
