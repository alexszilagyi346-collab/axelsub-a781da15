import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Anime } from "@/types/anime";

export const useAnimes = () => {
  return useQuery({
    queryKey: ["animes"],
    queryFn: async (): Promise<Anime[]> => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useFeaturedAnimes = () => {
  return useQuery({
    queryKey: ["featured-animes"],
    queryFn: async (): Promise<Anime[]> => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const usePopularAnimes = (limit: number = 14) => {
  return useQuery({
    queryKey: ["popular-animes", limit],
    queryFn: async (): Promise<Anime[]> => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("view_count" as any, { ascending: false, nullsFirst: false })
        .order("last_episode_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
};

export const useLatestAnimes = (limit: number = 12) => {
  return useQuery({
    queryKey: ["latest-animes", limit],
    queryFn: async (): Promise<Anime[]> => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("last_episode_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
};
