import { useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useIsModerator } from "@/hooks/useIsModerator";
import { useIsShopManager } from "@/hooks/useIsShopManager";
import {
  useShopProducts, useShopOrders, useShopSettings, useShopManagers,
  useUpsertProduct, useDeleteProduct, useUpdateOrderStatus, useUpdateCourier,
  useUpdateShopSettings, useGrantShopManager, useRevokeShopManager,
  ShopProduct, ShopOrder, ShopManager,
} from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Package, ShoppingBag, Settings, Users, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Eye, X, Check, Image, Loader2, Truck, Mail, Phone,
  Bot, SendHorizonal, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formatPrice = (p: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(p);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Függőben", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Visszaigazolva", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { label: "Kiszállítva", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  done: { label: "Teljesítve", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled: { label: "Törölve", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

type Tab = "products" | "orders" | "settings" | "managers";

const EMPTY_PRODUCT: Partial<ShopProduct> = {
  name: "", description: "", price: 0, images: [], category: "egyéb", in_stock: true, stock_count: null,
};

// ---- Product Form ----
const ProductForm = ({ initial, onDone }: { initial?: Partial<ShopProduct>; onDone: () => void }) => {
  const [form, setForm] = useState<Partial<ShopProduct>>(initial || EMPTY_PRODUCT);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const upsert = useUpsertProduct();

  const addImageUrl = () => {
    if (!imageUrl.trim()) return;
    setForm((f) => ({ ...f, images: [...(f.images || []), imageUrl.trim()] }));
    setImageUrl("");
  };

  const removeImage = (i: number) => {
    setForm((f) => ({ ...f, images: (f.images || []).filter((_, idx) => idx !== i) }));
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `shop/${Date.now()}.${ext}`;
    const buckets = ["shop", "animek"];
    let publicUrl: string | null = null;
    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
        break;
      }
    }
    if (!publicUrl) { toast.error("Feltöltési hiba: egyik bucket sem elérhető."); setUploading(false); return; }
    setForm((f) => ({ ...f, images: [...(f.images || []), publicUrl!] }));
    setUploading(false);
  };

  const handleSave = () => {
    if (!form.name?.trim()) { toast.error("Adj meg egy nevet!"); return; }
    if (!form.price || form.price <= 0) { toast.error("Adj meg érvényes árat!"); return; }
    upsert.mutate(form as any, { onSuccess: onDone });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Termék neve *</Label>
        <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 glass border-border/50" placeholder="Pl. Tanjiro póló" />
      </div>
      <div>
        <Label>Sorozat / Gyűjtemény</Label>
        <Input value={(form as any).collection || ""} onChange={(e) => setForm({ ...form, collection: e.target.value } as any)}
          className="mt-1 glass border-border/50" placeholder="Pl. Demon Slayer, Dragon Ball, One Piece..." />
        <p className="text-xs text-muted-foreground mt-1">Ezzel kerül egy csoportba a többi azonos sorozatú termék</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ár (Ft) *</Label>
          <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="mt-1 glass border-border/50" placeholder="3900" />
        </div>
        <div>
          <Label>Kategória</Label>
          <select
            value={form.category || "egyéb"}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-sm text-foreground"
          >
            {["bögre", "póló", "pulóver", "egyéb"].map((c) => (
              <option key={c} value={c} className="bg-background">{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Leírás</Label>
        <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 glass border-border/50 resize-none" rows={3} placeholder="Termék leírása..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Készleten</Label>
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={() => setForm({ ...form, in_stock: !form.in_stock })}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.in_stock ? "bg-primary" : "bg-muted"}`}>
              <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.in_stock ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            <span className="text-sm text-muted-foreground">{form.in_stock ? "Igen" : "Nem"}</span>
          </div>
        </div>
        <div>
          <Label>Darabszám (opcionális)</Label>
          <Input type="number" value={form.stock_count || ""} onChange={(e) => setForm({ ...form, stock_count: e.target.value ? Number(e.target.value) : null })}
            className="mt-1 glass border-border/50" placeholder="∞" />
        </div>
      </div>

      {/* Images */}
      <div>
        <Label>Képek</Label>
        <div className="mt-2 space-y-2">
          {(form.images || []).map((img, i) => (
            <div key={i} className="flex items-center gap-2">
              <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-border/50" />
              <span className="flex-1 text-xs text-muted-foreground truncate">{img}</span>
              <button onClick={() => removeImage(i)} className="text-destructive hover:text-destructive/80">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Kép URL-je..." className="glass border-border/50 text-sm" />
            <Button type="button" variant="outline" onClick={addImageUrl} size="sm">URL</Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 justify-center py-2 px-4 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-all">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                {uploading ? "Feltöltés..." : "Kép feltöltése"}
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }} />
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1 bg-primary hover:bg-primary/90 neon-glow">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Mentés
        </Button>
        <Button variant="outline" onClick={onDone} className="border-border/50">Mégse</Button>
      </div>
    </div>
  );
};

// ---- Order Email Dialog ----
const OrderEmailDialog = ({ order, onClose }: { order: ShopOrder; onClose: () => void }) => {
  const itemsList = (order.shop_order_items || [])
    .map((i) => `• ${i.product_name} × ${i.quantity}${i.custom_note ? ` (${i.custom_note})` : ""} — ${formatPrice(i.product_price * i.quantity)}`)
    .join("\n");

  const shippingLine = order.shipping_method === "post"
    ? `Postai szállítás: ${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
    : "Személyes átvétel";

  const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

  const botSubject = `📦 Rendelési összesítő – AxelSub Shop`;
  const botBody = `Kedves ${order.customer_name}!

Köszönjük rendelésedet az AxelSub Shopban! 🎌

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ RENDELT TERMÉKEK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RENDELÉS ADATAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Szállítás: ${shippingLine}
Fizetés: ${paymentLine}
Összesen: ${formatPrice(order.total_price)}${order.note ? `\nMegjegyzés: ${order.note}` : ""}

Ha kérdésed van, írj vissza erre az emailre!

Üdvözlettel,
AxelSub csapata 🎌`;

  const [subject, setSubject] = useState(botSubject);
  const [body, setBody] = useState(botBody);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const htmlContent = `<pre style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.7;color:#1e1e2e;white-space:pre-wrap;">${body}</pre>`;
      const res = await fetch("/api/send-custom-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ to: order.customer_email, subject, htmlContent }),
      });
      if (!res.ok) {
        const raw = await res.text();
        console.error("[send-custom-email] szerver hiba – nyers válasz:", raw);
        throw new Error(`Szerver hiba (${res.status}): ${raw.slice(0, 120)}`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(`Email elküldve → ${order.customer_email}`);
      onClose();
    } catch (err: any) {
      console.error("[send-custom-email] hiba:", err);
      toast.error(`Email hiba: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass border border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Bot className="h-5 w-5 text-primary" />
            Email küldése – {order.customer_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            A bot automatikusan kitöltötte a rendelés adataival. Szabadon szerkeszthető.
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tárgy</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="glass border-border/50 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Üzenet</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="glass border-border/50 text-sm font-mono resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSend} disabled={sending} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              {sending ? "Küldés..." : `Küldés → ${order.customer_email}`}
            </Button>
            <Button variant="outline" onClick={onClose} className="border-border/50">Mégse</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---- Order Row ----
const OrderRow = ({ order }: { order: ShopOrder }) => {
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [courierInput, setCourierInput] = useState(order.courier || "");
  const updateStatus = useUpdateOrderStatus();
  const updateCourier = useUpdateCourier();
  const statuses = Object.keys(STATUS_LABELS);

  return (
    <div className="glass border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{order.customer_name}</span>
            <Badge className={`text-xs border ${STATUS_LABELS[order.status]?.color || ""}`}>
              {STATUS_LABELS[order.status]?.label || order.status}
            </Badge>
            {order.courier && (
              <span className="flex items-center gap-1 text-xs text-purple-400">
                <Truck className="h-3 w-3" />{order.courier}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span>{new Date(order.created_at).toLocaleString("hu-HU")}</span>
            <span className="text-primary font-medium">{formatPrice(order.total_price)}</span>
            <a href={`mailto:${order.customer_email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary transition-colors">
              <Mail className="h-3 w-3" />{order.customer_email}
            </a>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Phone className="h-3 w-3" />{order.customer_phone}
              </a>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/30 pt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline flex items-center gap-1">
                <Mail className="h-3 w-3" />{order.customer_email}
              </a>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Telefon</p>
              {order.customer_phone
                ? <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{order.customer_phone}</a>
                : <p className="text-foreground">–</p>
              }
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Szállítás</p>
              <p className="text-foreground capitalize">{order.shipping_method === "post" ? "Postai" : "Személyes"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Fizetés</p>
              <p className="text-foreground capitalize">{order.payment_method === "transfer" ? "Átutalás" : "Készpénz"}</p>
            </div>
            {order.shipping_method === "post" && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-muted-foreground text-xs">Szállítási cím</p>
                <p className="text-foreground">{order.shipping_zip} {order.shipping_city}, {order.shipping_address}</p>
              </div>
            )}
            {order.note && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-muted-foreground text-xs">Megjegyzés</p>
                <p className="text-foreground">{order.note}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {order.shop_order_items && order.shop_order_items.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Rendelt termékek:</p>
              <div className="space-y-1.5">
                {order.shop_order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.product_name} × {item.quantity}
                      {item.custom_note && <span className="text-muted-foreground"> ({item.custom_note})</span>}
                    </span>
                    <span className="text-primary">{formatPrice(item.product_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courier */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Truck className="h-3 w-3" /> Futár / nyomkövetési szám:</p>
            <div className="flex gap-2">
              <Input
                value={courierInput}
                onChange={(e) => setCourierInput(e.target.value)}
                placeholder="Pl. GLS, MPL, 1Z999AA..."
                className="glass border-border/50 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updateCourier.isPending || courierInput === (order.courier || "")}
                onClick={() => updateCourier.mutate({ id: order.id, courier: courierInput })}
                className="border-border/50"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status change */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Státusz módosítása:</p>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus.mutate({ id: order.id, status: s, order })}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${order.status === s
                    ? `${STATUS_LABELS[s].color} border-current`
                    : "border-border/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {STATUS_LABELS[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Email küldő gomb */}
          <div className="pt-1 border-t border-border/20">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEmailOpen(true)}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
            >
              <Bot className="h-4 w-4" />
              Email küldése vevőnek
              <Sparkles className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        </div>
      )}

      {emailOpen && <OrderEmailDialog order={order} onClose={() => setEmailOpen(false)} />}
    </div>
  );
};

// ---- Main ShopAdmin ----
const ShopAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isModerator, loading: modLoading } = useIsModerator();
  const { isShopManager, loading: shopLoading } = useIsShopManager();
  const loading = authLoading || adminLoading || modLoading || shopLoading;
  const canAccess = isAdmin || isModerator || isShopManager;

  const [tab, setTab] = useState<Tab>("products");
  const [editProduct, setEditProduct] = useState<Partial<ShopProduct> | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [managerEmail, setManagerEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  const { data: products, isLoading: prodLoading } = useShopProducts();
  const { data: orders, isLoading: ordersLoading } = useShopOrders();
  const { data: settings } = useShopSettings();
  const { data: managers } = useShopManagers();

  const deleteProduct = useDeleteProduct();
  const updateSettings = useUpdateShopSettings();
  const grantManager = useGrantShopManager();
  const revokeManager = useRevokeShopManager();

  const [settingsForm, setSettingsForm] = useState<any>(null);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center pt-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );

  if (!user || !canAccess) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Hozzáférés megtagadva</h1>
          <p className="text-muted-foreground">Nincs admin vagy bolt-kezelő jogosultságod.</p>
        </div>
      </main>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "products", label: "Termékek", icon: <Package className="h-4 w-4" /> },
    { id: "orders", label: "Rendelések", icon: <ShoppingBag className="h-4 w-4" /> },
    { id: "settings", label: "Beállítások", icon: <Settings className="h-4 w-4" /> },
    ...(isAdmin ? [{ id: "managers" as Tab, label: "Kezelők", icon: <Users className="h-4 w-4" /> }] : []),
  ];

  const sf = settingsForm || settings;

  const filteredOrders = orders?.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch =
      o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(orderSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Bolt Kezelőpanel
              </h1>
              <p className="text-sm text-muted-foreground">Termékek, rendelések és beállítások</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Termékek", value: products?.length || 0, color: "text-primary" },
              { label: "Rendelések", value: orders?.length || 0, color: "text-blue-400" },
              { label: "Függőben", value: orders?.filter((o) => o.status === "pending").length || 0, color: "text-yellow-400" },
              { label: "Teljesítve", value: orders?.filter((o) => o.status === "done").length || 0, color: "text-green-400" },
            ].map((stat) => (
              <div key={stat.label} className="glass border border-border/40 rounded-xl p-4 text-center">
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border/30 pb-0 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* PRODUCTS TAB */}
          {tab === "products" && (
            <div className="space-y-4">
              {showNewProduct || editProduct ? (
                <div className="glass border border-border/40 rounded-2xl p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    {editProduct?.id ? "Termék szerkesztése" : "Új termék"}
                  </h3>
                  <ProductForm
                    initial={editProduct || EMPTY_PRODUCT}
                    onDone={() => { setEditProduct(null); setShowNewProduct(false); }}
                  />
                </div>
              ) : (
                <Button onClick={() => setShowNewProduct(true)} className="bg-primary hover:bg-primary/90 neon-glow">
                  <Plus className="h-4 w-4 mr-2" /> Új termék
                </Button>
              )}

              {prodLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products?.map((product) => (
                    <div key={product.id} className="glass border border-border/40 rounded-xl p-4 flex gap-4 items-start">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-primary/5 border border-border/40">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground text-sm line-clamp-1">{product.name}</h4>
                            <p className="text-primary font-bold text-sm">{formatPrice(product.price)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="text-xs capitalize">{product.category}</Badge>
                              {!product.in_stock && <Badge variant="destructive" className="text-xs">Elfogyott</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { setEditProduct(product); setShowNewProduct(false); }}
                              className="w-8 h-8 rounded-lg glass border border-border/40 hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Törölni szeretnéd: "${product.name}"?`))
                                  deleteProduct.mutate(product.id);
                              }}
                              className="w-8 h-8 rounded-lg glass border border-border/40 hover:border-destructive/50 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ORDERS TAB */}
          {tab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Keresés névben, emailben..."
                  className="glass border-border/50 sm:max-w-xs"
                />
                <div className="flex gap-2 flex-wrap">
                  {["all", ...Object.keys(STATUS_LABELS)].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        statusFilter === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "glass border-border/40 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {s === "all" ? "Mind" : STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : filteredOrders && filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nincs rendelés</p>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && sf && (
            <div className="max-w-xl space-y-6">
              <div className="glass border border-border/40 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Bolt beállítások
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Bolt állapota</p>
                    <p className="text-xs text-muted-foreground">Ha kikapcsolod, a bolt oldal nem elérhető</p>
                  </div>
                  <button
                    onClick={() => setSettingsForm({ ...(sf), shop_open: !sf.shop_open })}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${sf.shop_open ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${sf.shop_open ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              <div className="glass border border-border/40 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Szállítási díjak
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Szállítási díj (Ft)</Label>
                    <Input type="number" value={sf.shipping_price || ""}
                      onChange={(e) => setSettingsForm({ ...(sf), shipping_price: Number(e.target.value) })}
                      className="mt-1 glass border-border/50" />
                  </div>
                  <div>
                    <Label>Ingyenes szállítás felett (Ft)</Label>
                    <Input type="number" value={sf.free_shipping_above || ""}
                      onChange={(e) => setSettingsForm({ ...(sf), free_shipping_above: Number(e.target.value) })}
                      className="mt-1 glass border-border/50" />
                  </div>
                </div>
              </div>

              <div className="glass border border-border/40 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Banki átutalás adatai
                </h3>
                <div>
                  <Label>Bank neve</Label>
                  <Input value={sf.bank_name || ""} onChange={(e) => setSettingsForm({ ...(sf), bank_name: e.target.value })}
                    className="mt-1 glass border-border/50" placeholder="OTP Bank" />
                </div>
                <div>
                  <Label>Számlatulajdonos</Label>
                  <Input value={sf.bank_account_holder || ""} onChange={(e) => setSettingsForm({ ...(sf), bank_account_holder: e.target.value })}
                    className="mt-1 glass border-border/50" placeholder="Kovács János" />
                </div>
                <div>
                  <Label>Számlaszám</Label>
                  <Input value={sf.bank_account || ""} onChange={(e) => setSettingsForm({ ...(sf), bank_account: e.target.value })}
                    className="mt-1 glass border-border/50 font-mono" placeholder="12345678-12345678-12345678" />
                </div>
              </div>

              <div className="glass border border-border/40 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Kapcsolat
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input value={sf.shop_email || ""} onChange={(e) => setSettingsForm({ ...(sf), shop_email: e.target.value })}
                      className="mt-1 glass border-border/50" placeholder="bolt@axelsub.hu" />
                  </div>
                  <div>
                    <Label>Telefonszám</Label>
                    <Input value={sf.shop_phone || ""} onChange={(e) => setSettingsForm({ ...(sf), shop_phone: e.target.value })}
                      className="mt-1 glass border-border/50" placeholder="+36 30 123 4567" />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (sf?.id) updateSettings.mutate(sf);
                }}
                disabled={updateSettings.isPending}
                className="bg-primary hover:bg-primary/90 neon-glow w-full"
              >
                {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Beállítások mentése
              </Button>
            </div>
          )}

          {/* MANAGERS TAB (admin only) */}
          {tab === "managers" && isAdmin && (
            <div className="max-w-xl space-y-6">
              <div className="glass border border-border/40 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Bolt-kezelő hozzáadása
                </h3>
                <p className="text-sm text-muted-foreground">
                  A bolt-kezelők hozzáférnek a termékekhez, rendelésekhez és beállításokhoz,
                  de az admin panelhez és a többi funkcióhoz <b>nem</b>.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="felhasznalo@email.com"
                    className="glass border-border/50"
                  />
                  <Button
                    onClick={() => {
                      if (!managerEmail.trim()) return;
                      grantManager.mutate(managerEmail.trim(), { onSuccess: () => setManagerEmail("") });
                    }}
                    disabled={grantManager.isPending}
                    className="bg-primary hover:bg-primary/90 shrink-0"
                  >
                    {grantManager.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hozzáadás"}
                  </Button>
                </div>
              </div>

              <div className="glass border border-border/40 rounded-2xl p-6 space-y-3">
                <h3 className="font-bold text-foreground">Jelenlegi bolt-kezelők</h3>
                {managers && managers.length > 0 ? (
                  (managers as ShopManager[]).map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border/50" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-border/50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary/60" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {m.display_name || <span className="text-muted-foreground font-mono text-xs">{m.user_id.slice(0, 16)}…</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Hozzáadva: {new Date(m.created_at).toLocaleDateString("hu-HU")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Visszavonod a bolt-kezelő jogot?"))
                            revokeManager.mutate(m.user_id);
                        }}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Még nincs bolt-kezelő.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ShopAdmin;
