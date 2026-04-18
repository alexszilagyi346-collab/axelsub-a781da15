import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useIsModerator = () => {
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const check = async () => {
      if (!user) { setIsModerator(false); setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);
      setIsModerator((data?.length ?? 0) > 0);
      setLoading(false);
    };
    check();
  }, [user]);

  return { isModerator, loading };
};
