import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Rating {
  id: string;
  user_id: string;
  anime_id: string;
  score: number;
  created_at: string;
}

export const useAnimeRating = (animeId: string | undefined) => {
  return useQuery({
    queryKey: ["anime-rating", animeId],
    queryFn: async () => {
      if (!animeId) return null;
      
      const { data, error } = await supabase
        .from("ratings")
        .select("score")
        .eq("anime_id", animeId);

      if (error) throw error;
      
      if (!data || data.length === 0) return { average: 0, count: 0 };
      
      const sum = data.reduce((acc, r) => acc + r.score, 0);
      return {
        average: sum / data.length,
        count: data.length,
      };
    },
    enabled: !!animeId,
  });
};

export const useUserRating = (animeId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-rating", user?.id, animeId],
    queryFn: async () => {
      if (!user || !animeId) return null;
      
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("anime_id", animeId)
        .maybeSingle();

      if (error) throw error;
      return data as Rating | null;
    },
    enabled: !!user && !!animeId,
  });
};

export const useSetRating = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      animeId,
      score,
    }: {
      animeId: string;
      score: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (score < 1 || score > 10) throw new Error("Score must be between 1 and 10");

      const { data, error } = await supabase
        .from("ratings")
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            score,
          },
          {
            onConflict: "user_id,anime_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-rating", user?.id, variables.animeId] });
      queryClient.invalidateQueries({ queryKey: ["anime-rating", variables.animeId] });
    },
  });
};

export const useDeleteRating = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animeId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ratings")
        .delete()
        .eq("user_id", user.id)
        .eq("anime_id", animeId);

      if (error) throw error;
    },
    onSuccess: (_, animeId) => {
      queryClient.invalidateQueries({ queryKey: ["user-rating", user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ["anime-rating", animeId] });
    },
  });
};
