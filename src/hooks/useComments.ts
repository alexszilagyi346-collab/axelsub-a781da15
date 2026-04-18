import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Comment {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id: string | null;
  content: string;
  is_spoiler: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export const useComments = (animeId: string, episodeId?: string) => {
  return useQuery({
    queryKey: ["comments", animeId, episodeId],
    queryFn: async () => {
      let query = supabase
        .from("comments")
        .select("*")
        .eq("anime_id", animeId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (episodeId) {
        query = query.eq("episode_id", episodeId);
      } else {
        query = query.is("episode_id", null);
      }

      const { data: comments, error } = await query;

      if (error) throw error;

      // Fetch profiles for comments
      const userIds = [...new Set((comments || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (comments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select("*")
            .eq("parent_id", comment.id)
            .order("created_at", { ascending: true });

          const replyUserIds = [...new Set((replies || []).map(r => r.user_id))];
          const { data: replyProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", replyUserIds);

          const replyProfileMap = new Map(replyProfiles?.map(p => [p.user_id, p]) || []);

          return {
            ...comment,
            profile: profileMap.get(comment.user_id) || null,
            replies: (replies || []).map(reply => ({
              ...reply,
              profile: replyProfileMap.get(reply.user_id) || null,
            })),
          };
        })
      );

      return commentsWithReplies as Comment[];
    },
  });
};

export const useAddComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      animeId,
      episodeId,
      content,
      isSpoiler = false,
      parentId = null,
    }: {
      animeId: string;
      episodeId?: string;
      content: string;
      isSpoiler?: boolean;
      parentId?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          anime_id: animeId,
          episode_id: episodeId || null,
          content,
          is_spoiler: isSpoiler,
          parent_id: parentId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.animeId] });
    },
  });
};

export const useDeleteComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, animeId }: { commentId: string; animeId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return { commentId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.animeId] });
    },
  });
};
