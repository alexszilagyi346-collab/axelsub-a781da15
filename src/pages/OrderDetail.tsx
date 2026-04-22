import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { ShopOrder, ShopOrderItem, ShopProduct } from "@/hooks/useShop";
import { Loader2, Package, ArrowLeft, Truck, MapPin, CreditCard, Mail, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatPrice = (p: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(p);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Függőben", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Visszaigazolva", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { label: "Kiszállítva", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  done: { label: "Teljesítve", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled: { label: "Törölve", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

type EnrichedItem = ShopOrderItem & { category?: string; image?: string | null };

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const { data: o, error: oErr } = await supabase
        .from("shop_orders" as any)
        .select("*, shop_order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (oErr || !o) {
        setError("A rendelés nem található vagy nincs jogosultságod megtekinteni.");
        setLoading(false);
        return;
      }
      const order = o as unknown as ShopOrder;
      const orderItems = (order.shop_order_items || []) as ShopOrderItem[];
      const productIds = Array.from(new Set(orderItems.map((i) => i.product_id).filter(Boolean))) as string[];
      let prodMap = new Map<string, ShopProduct>();
      if (productIds.length) {
        const { data: products } = await supabase
          .from("shop_products" as any)
          .select("id, category, images, name")
          .in("id", productIds);
        prodMap = new Map(((products as unknown as ShopProduct[]) || []).map((p) => [p.id, p]));
      }
      const enriched: EnrichedItem[] = orderItems.map((it) => {
        const p = it.product_id ? prodMap.get(it.product_id) : undefined;
        return { ...it, category: p?.category, image: p?.images?.[0] || null };
      });
      setOrder(order);
      setItems(enriched);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Vissza a boltba
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Rendelés betöltése...
          </div>
        ) : error ? (
          <div className="glass border border-destructive/40 rounded-xl p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-destructive/70 mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-2">Hiba</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="glass border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Rendelés</div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">#{order.id.slice(0, 8).toUpperCase()}</h1>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(order.created_at).toLocaleString("hu-HU", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>
                <Badge className={`${STATUS_LABELS[order.status]?.color || ""} border text-sm px-3 py-1`}>
                  {STATUS_LABELS[order.status]?.label || order.status}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4">
                  <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Rendelő</div>
                    <div className="font-semibold text-foreground">{order.customer_name}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="break-all">
                    <div className="text-xs text-muted-foreground">E-mail</div>
                    <div className="font-semibold text-foreground">{order.customer_email}</div>
                  </div>
                </div>
                {order.customer_phone && (
                  <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4">
                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Telefon</div>
                      <div className="font-semibold text-foreground">{order.customer_phone}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4">
                  <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Fizetés</div>
                    <div className="font-semibold text-foreground">
                      {order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4 sm:col-span-2">
                  {order.shipping_method === "post" ? (
                    <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Szállítás</div>
                    <div className="font-semibold text-foreground">
                      {order.shipping_method === "post"
                        ? `Postai – ${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
                        : "Személyes átvétel"}
                    </div>
                  </div>
                </div>
                {order.courier && (
                  <div className="flex items-start gap-3 bg-background/40 border border-border/50 rounded-xl p-4 sm:col-span-2">
                    <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Futár / nyomkövetés</div>
                      <div className="font-semibold text-foreground">{order.courier}</div>
                    </div>
                  </div>
                )}
                {order.note && (
                  <div className="bg-background/40 border border-border/50 rounded-xl p-4 sm:col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Megjegyzés</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{order.note}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass border border-border/50 rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Rendelt termékek
              </h2>
              <div className="space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex gap-4 items-center bg-background/40 border border-border/50 rounded-xl p-3"
                  >
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.product_name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border border-border/50 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center text-muted-foreground shrink-0">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{it.product_name}</div>
                      {it.category && (
                        <Badge className="mt-1 bg-primary/15 text-primary border-primary/30 text-[10px] uppercase tracking-wider">
                          {it.category}
                        </Badge>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">
                        Mennyiség: <strong className="text-foreground">{it.quantity}</strong> · Egységár:{" "}
                        <strong className="text-foreground">{formatPrice(it.product_price)}</strong>
                      </div>
                      {it.custom_note && (
                        <div className="text-xs text-muted-foreground mt-1">📝 {it.custom_note}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Részösszeg</div>
                      <div className="text-lg font-bold text-foreground">
                        {formatPrice(it.product_price * it.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 mt-6 pt-4 flex items-center justify-between">
                <span className="text-muted-foreground">Összesen</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(order.total_price)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default OrderDetail;
