import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Subscription {
  id: string;
  user_id: string;
  anime_id: string;
  created_at: string;
}

export const useSubscription = (animeId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", animeId, user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("anime_subscriptions")
        .select("*")
        .eq("anime_id", animeId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user && !!animeId,
  });
};

export const useToggleSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ animeId, isSubscribed }: { animeId: string; isSubscribed: boolean }) => {
      if (!user) throw new Error("Bejelentkezés szükséges");

      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from("anime_subscriptions")
          .delete()
          .eq("anime_id", animeId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Subscribe
        const { error } = await supabase
          .from("anime_subscriptions")
          .insert({ anime_id: animeId, user_id: user.id });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", variables.animeId, user?.id] });
      toast.success(variables.isSubscribed ? "Értesítések kikapcsolva" : "Értesítések bekapcsolva");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUserSubscriptions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-subscriptions", user?.id],
    queryFn: async (): Promise<Subscription[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("anime_subscriptions")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as Subscription[];
    },
    enabled: !!user,
  });
};
