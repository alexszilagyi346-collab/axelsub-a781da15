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

export const useFeaturedAnime = () => {
  return useQuery({
    queryKey: ["featured-anime"],
    queryFn: async (): Promise<Anime | null> => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .eq("is_featured", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
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
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
};
