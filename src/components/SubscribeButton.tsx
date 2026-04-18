import { motion } from "framer-motion";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useToggleSubscription } from "@/hooks/useSubscriptions";
import { cn } from "@/lib/utils";

interface SubscribeButtonProps {
  animeId: string;
  className?: string;
  showLabel?: boolean;
}

const SubscribeButton = ({ animeId, className, showLabel = false }: SubscribeButtonProps) => {
  const { user } = useAuth();
  const { data: subscription, isLoading } = useSubscription(animeId);
  const toggleSubscription = useToggleSubscription();

  if (!user) return null;

  const isSubscribed = !!subscription;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSubscription.mutate({ animeId, isSubscribed });
  };

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant={isSubscribed ? "default" : "outline"}
        size={showLabel ? "default" : "icon"}
        className={cn(
          isSubscribed
            ? "bg-primary hover:bg-primary/90"
            : "border-primary/50 hover:bg-primary/10",
          className
        )}
        onClick={handleClick}
        disabled={isLoading || toggleSubscription.isPending}
      >
        {isLoading || toggleSubscription.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellOff className="h-4 w-4" />
            {showLabel && <span className="ml-2">Értesítések ki</span>}
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            {showLabel && <span className="ml-2">Értesítések be</span>}
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default SubscribeButton;
