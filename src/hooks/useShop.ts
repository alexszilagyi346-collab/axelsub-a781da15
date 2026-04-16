import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  category: string;
  in_stock: boolean;
  stock_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  custom_note: string | null;
}

export interface ShopOrder {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_zip: string;
  shipping_method: string;
  payment_method: string;
  status: string;
  total_price: number;
  note: string | null;
  courier: string | null;
  created_at: string;
  updated_at: string;
  shop_order_items?: ShopOrderItem[];
}

export interface ShopSettings {
  id: string;
  bank_name: string;
  bank_account: string;
  bank_account_holder: string;
  shipping_price: number;
  free_shipping_above: number;
  shop_email: string;
  shop_phone: string;
  shop_open: boolean;
  updated_at: string;
}

// --- Products ---
export const useShopProducts = () =>
  useQuery({
    queryKey: ["shop_products"],
    queryFn: async (): Promise<ShopProduct[]> => {
      const { data, error } = await supabase
        .from("shop_products" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ShopProduct[]) || [];
    },
  });

export const useShopProduct = (id: string | undefined) =>
  useQuery({
    queryKey: ["shop_product", id],
    queryFn: async (): Promise<ShopProduct | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("shop_products" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ShopProduct;
    },
    enabled: !!id,
  });

export const useUpsertProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Partial<ShopProduct> & { id?: string }) => {
      if (product.id) {
        const { error } = await supabase
          .from("shop_products" as any)
          .update({ ...product, updated_at: new Date().toISOString() })
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shop_products" as any)
          .insert(product);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_products"] });
      toast.success("Termék mentve!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shop_products" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_products"] });
      toast.success("Termék törölve!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};

// --- Orders ---
export const useShopOrders = () =>
  useQuery({
    queryKey: ["shop_orders"],
    queryFn: async (): Promise<ShopOrder[]> => {
      const { data, error } = await supabase
        .from("shop_orders" as any)
        .select("*, shop_order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ShopOrder[]) || [];
    },
  });

export const usePlaceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: Omit<ShopOrder, "id" | "created_at" | "updated_at" | "shop_order_items">;
      items: Omit<ShopOrderItem, "id" | "order_id">[];
    }) => {
      const { data: orderData, error: orderError } = await supabase
        .from("shop_orders" as any)
        .insert(order)
        .select()
        .single();
      if (orderError) throw orderError;
      const orderId = (orderData as ShopOrder).id;
      const { error: itemsError } = await supabase
        .from("shop_order_items" as any)
        .insert(items.map((item) => ({ ...item, order_id: orderId })));
      if (itemsError) throw itemsError;
      return orderData as ShopOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_orders"] });
    },
    onError: (e: any) => toast.error(e.message || "Hiba a rendelés során"),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("shop_orders" as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_orders"] });
      toast.success("Státusz frissítve!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};

export const useUpdateCourier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courier }: { id: string; courier: string }) => {
      const { error } = await supabase
        .from("shop_orders" as any)
        .update({ courier, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_orders"] });
      toast.success("Futár mentve!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};

// --- Settings ---
export const useShopSettings = () =>
  useQuery({
    queryKey: ["shop_settings"],
    queryFn: async (): Promise<ShopSettings | null> => {
      const { data, error } = await supabase
        .from("shop_settings" as any)
        .select("*")
        .single();
      if (error) return null;
      return data as ShopSettings;
    },
  });

export const useUpdateShopSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<ShopSettings> & { id: string }) => {
      const { error } = await supabase
        .from("shop_settings" as any)
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_settings"] });
      toast.success("Beállítások mentve!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};

// --- Shop Managers ---
export const useShopManagers = () =>
  useQuery({
    queryKey: ["shop_managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("user_id, created_at")
        .eq("role", "shop_manager");
      if (error) throw error;
      return (data as { user_id: string; created_at: string }[]) || [];
    },
  });

export const useGrantShopManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.rpc("grant_shop_manager" as any, { p_email: email });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_managers"] });
      toast.success("Bolt-kezelő jog megadva!");
    },
    onError: (e: any) => toast.error(e.message || "Nem található ilyen felhasználó"),
  });
};

export const useRevokeShopManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("revoke_shop_manager" as any, { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_managers"] });
      toast.success("Bolt-kezelő jog visszavonva!");
    },
    onError: (e: any) => toast.error(e.message || "Hiba"),
  });
};
