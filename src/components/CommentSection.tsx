import { useState } from "react";
import { MessageCircle, Send, AlertTriangle, Trash2, Reply, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useComments, useAddComment, useDeleteComment, Comment } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  animeId: string;
  episodeId?: string;
}

const SpoilerText = ({ children, isSpoiler }: { children: React.ReactNode; isSpoiler: boolean }) => {
  const [revealed, setRevealed] = useState(false);

  if (!isSpoiler) return <>{children}</>;

  return (
    <div className="relative">
      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Spoiler - Kattints a megjelenítéshez</span>
        </button>
      )}
      {revealed && (
        <div className="relative">
          <button
            onClick={() => setRevealed(false)}
            className="absolute -top-1 -right-1 text-muted-foreground hover:text-foreground"
          >
            <Eye className="w-4 h-4" />
          </button>
          {children}
        </div>
      )}
    </div>
  );
};

const CommentCard = ({ 
  comment, 
  onReply, 
  onDelete,
  isReply = false 
}: { 
  comment: Comment; 
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const canDelete = user?.id === comment.user_id || isAdmin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex gap-3 p-4 rounded-lg bg-card border border-border",
        isReply && "ml-8 bg-muted/30"
      )}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {comment.profile?.display_name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">
            {comment.profile?.display_name || "Anonim"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { 
              addSuffix: true, 
              locale: hu 
            })}
          </span>
          {comment.is_spoiler && (
            <span className="px-2 py-0.5 text-xs bg-destructive/20 text-destructive rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Spoiler
            </span>
          )}
        </div>

        <SpoilerText isSpoiler={comment.is_spoiler}>
          <p className="text-muted-foreground whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </SpoilerText>

        <div className="flex items-center gap-4 mt-2">
          {!isReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-4 h-4" />
              Válasz
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Törlés
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CommentSection = ({ animeId, episodeId }: CommentSectionProps) => {
  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(animeId, episodeId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "A hozzászóláshoz jelentkezz be.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) return;

    try {
      await addComment.mutateAsync({
        animeId,
        episodeId,
        content: content.trim(),
        isSpoiler,
        parentId: replyingTo,
      });
      setContent("");
      setIsSpoiler(false);
      setReplyingTo(null);
      toast({ title: "Hozzászólás elküldve" });
    } catch (error) {
      toast({
        title: "Hiba történt",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, animeId });
      toast({ title: "Hozzászólás törölve" });
    } catch (error) {
      toast({
        title: "Hiba történt",
        variant: "destructive",
      });
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    document.getElementById("comment-input")?.focus();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        Hozzászólások
        {comments && comments.length > 0 && (
          <span className="text-sm text-muted-foreground font-normal">
            ({comments.length})
          </span>
        )}
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {replyingTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="w-4 h-4" />
            <span>Válasz írása</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-primary hover:underline"
            >
              Mégse
            </button>
          </div>
        )}
        
        <Textarea
          id="comment-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={user ? "Írd meg a véleményed..." : "Jelentkezz be a hozzászóláshoz"}
          disabled={!user}
          className="min-h-[100px] resize-none"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="spoiler"
              checked={isSpoiler}
              onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
            />
            <label htmlFor="spoiler" className="text-sm text-muted-foreground cursor-pointer">
              Spoilert tartalmaz
            </label>
          </div>
          
          <Button
            type="submit"
            disabled={!user || !content.trim() || addComment.isPending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Küldés
          </Button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Még nincsenek hozzászólások</p>
            <p className="text-sm">Légy te az első!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
