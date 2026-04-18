import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useIsShopManager = () => {
  const [isShopManager, setIsShopManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsShopManager(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "shop_manager")
        .maybeSingle();
      setIsShopManager(!!data);
      setLoading(false);
    };
    check();
  }, [user]);

  return { isShopManager, loading };
};
