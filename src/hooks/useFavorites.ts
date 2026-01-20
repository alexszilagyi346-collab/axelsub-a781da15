import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FavoriteEntry {
  id: string;
  user_id: string;
  anime_id: string;
  created_at: string;
  anime?: {
    id: string;
    title: string;
    image_url: string | null;
    genre: string | null;
  };
}

export const useFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          *,
          anime:animes(id, title, image_url, genre)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FavoriteEntry[];
    },
    enabled: !!user,
  });
};

export const useIsFavorite = (animeId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-favorite", user?.id, animeId],
    queryFn: async () => {
      if (!user || !animeId) return false;
      
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("anime_id", animeId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!animeId,
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animeId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already favorited
      const { data: existing } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("anime_id", animeId)
        .maybeSingle();

      if (existing) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "removed" as const };
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            anime_id: animeId,
          });
        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: (_, animeId) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["is-favorite", user?.id, animeId] });
    },
  });
};
