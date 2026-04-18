import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { useShopProduct, useShopSettings, usePlaceOrder } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingBag, Truck, CreditCard, Package, CheckCircle2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ParticleBackground from "@/components/ParticleBackground";

const formatPrice = (p: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(p);

type Step = "details" | "order" | "success";

const ShopProduct = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useShopProduct(id);
  const { data: settings } = useShopSettings();
  const { user } = useAuth();
  const placeOrder = usePlaceOrder();

  const [imageIdx, setImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customNote, setCustomNote] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [step, setStep] = useState<Step>("details");

  const isClothing = product ? ["póló", "pulóver"].includes(product.category) : false;
  const isMug = product?.category === "bögre";
  const needsSize = isClothing || isMug;

  const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const MUG_SIZES = ["250 ml", "450 ml"];
  const sizeOptions = isClothing ? CLOTHING_SIZES : isMug ? MUG_SIZES : [];

  const buildVariantNote = () => {
    const parts: string[] = [];
    if (selectedSize) parts.push(`Méret: ${selectedSize}`);
    if (selectedGender) parts.push(`Típus: ${selectedGender}`);
    if (customNote.trim()) parts.push(customNote.trim());
    return parts.join(" | ");
  };

  const [form, setForm] = useState({
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    zip: "",
    shipping: "post",
    payment: "transfer",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-28 grid md:grid-cols-2 gap-10">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-5 w-1/3 rounded" />
          <Skeleton className="h-24 rounded" />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Header />
      <div className="text-center text-muted-foreground pt-28">
        <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-xl">Termék nem található</p>
        <Link to="/shop"><Button className="mt-4">Vissza a boltba</Button></Link>
      </div>
    </div>
  );

  const shopClosed = settings !== undefined && settings !== null && !settings.shop_open;
  if (shopClosed) return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Header />
      <div className="flex flex-col items-center justify-center pt-40 text-center relative z-10 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          A bolt jelenleg zárva van
        </h1>
        <p className="text-muted-foreground max-w-sm mb-6">
          Hamarosan visszatérünk! Kövesd az oldalunkat az aktuális információkért.
        </p>
        <Link to="/shop"><Button variant="outline">Vissza a boltba</Button></Link>
      </div>
    </div>
  );

  const shippingPrice =
    form.shipping === "personal" ? 0 : (settings?.shipping_price || 1500);
  const subtotal = product.price * quantity;
  const total =
    settings?.free_shipping_above && subtotal >= settings.free_shipping_above
      ? subtotal
      : subtotal + shippingPrice;
  const isFreeShipping =
    !!settings?.free_shipping_above && subtotal >= settings.free_shipping_above;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Kötelező mező";
    if (!form.email.trim()) e.email = "Kötelező mező";
    if (form.shipping === "post") {
      if (!form.address.trim()) e.address = "Kötelező mező";
      if (!form.city.trim()) e.city = "Kötelező mező";
      if (!form.zip.trim()) e.zip = "Kötelező mező";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDetailsNext = () => {
    if (needsSize && !selectedSize) {
      toast.error("Kérjük válassz méretet!");
      return;
    }
    if (isClothing && !selectedGender) {
      toast.error("Kérjük válassz típust (Férfi / Női)!");
      return;
    }
    setStep("order");
  };

  const handleOrder = async () => {
    if (!validate()) return;
    const orderPayload = {
      user_id: user?.id || null,
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      shipping_address: form.address || "Személyes átvétel",
      shipping_city: form.city || "–",
      shipping_zip: form.zip || "–",
      shipping_method: form.shipping,
      payment_method: form.payment,
      status: "pending",
      total_price: total,
      note: form.note || null,
    };
    const variantNote = buildVariantNote();
    const orderItems = [
      {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity,
        custom_note: variantNote || null,
      },
    ];
    try {
      await placeOrder.mutateAsync({ order: orderPayload, items: orderItems });
      setStep("success");
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error("Hiba a rendelés leadásakor. Kérjük próbáld újra!");
    }
  };

  if (step === "success") return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-lg relative z-10">
        <div className="glass border border-green-500/30 rounded-3xl p-8 shadow-xl shadow-green-500/10 text-center">

          {/* Zöld pipa animálva */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Rendelés sikeresen leadva!
          </h1>
          <p className="text-muted-foreground mb-1">
            Köszönjük, <span className="text-foreground font-semibold">{form.name}</span>!
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Visszaigazolást küldünk a(z) <span className="text-primary font-medium">{form.email}</span> címre.
          </p>

          {/* Összegző kártya */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left mb-6 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Termék</span>
              <span className="text-foreground font-medium">{product.name} × {quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Szállítás</span>
              <span className="text-foreground">{form.shipping === "post" ? "Postai" : "Személyes átvétel"}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/30 pt-2 mt-2">
              <span className="text-foreground font-bold">Összesen</span>
              <span className="text-primary font-black text-base">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Átutalási adatok ha kell */}
          {form.payment === "transfer" && settings?.bank_account && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-left mb-6 text-sm">
              <p className="font-bold text-foreground mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-400" />
                Banki átutalás adatai
              </p>
              {settings.bank_name && (
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="text-foreground">{settings.bank_name}</span>
                </div>
              )}
              {settings.bank_account_holder && (
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Kedvezményezett</span>
                  <span className="text-foreground">{settings.bank_account_holder}</span>
                </div>
              )}
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Számlaszám</span>
                <span className="text-foreground font-mono font-bold">{settings.bank_account}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Összeg</span>
                <span className="text-primary font-bold">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Közlemény</span>
                <span className="text-foreground">{form.name} – rendelés</span>
              </div>
            </div>
          )}

          {/* Gombok */}
          <div className="flex flex-col gap-3">
            <Link to="/shop">
              <Button className="w-full bg-primary hover:bg-primary/90 neon-glow font-bold">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Vissza a boltba
              </Button>
            </Link>
            <Link to="/news">
              <Button variant="outline" className="w-full border-border/50 hover:border-primary/50">
                Közösség & Hírek
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Breadcrumb */}
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Vissza a boltba
          </Link>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Images */}
            <div>
              <div className="relative aspect-square rounded-2xl overflow-hidden glass border border-border/50">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[imageIdx]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground/20" />
                  </div>
                )}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImageIdx((i) => Math.max(0, i - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 glass border border-border/60 rounded-full flex items-center justify-center hover:border-primary/50 transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setImageIdx((i) => Math.min(product.images.length - 1, i + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 glass border border-border/60 rounded-full flex items-center justify-center hover:border-primary/50 transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIdx(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imageIdx ? "border-primary" : "border-border/40"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info + Order */}
            <div className="space-y-6">
              {step === "details" && (
                <>
                  <div>
                    <Badge className="mb-2 capitalize">{product.category}</Badge>
                    <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {product.name}
                    </h1>
                    <p className="text-3xl font-bold text-primary mt-2">{formatPrice(product.price)}</p>
                    {!product.in_stock && (
                      <Badge variant="destructive" className="mt-2">Elfogyott</Badge>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                  )}

                  {/* Gender picker - clothing only */}
                  {isClothing && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Típus *</Label>
                      <div className="flex gap-3">
                        {["Férfi", "Női"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGender(g)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selectedGender === g ? "border-primary bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size picker */}
                  {needsSize && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        {isMug ? "Méret *" : "Ruhaméret *"}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSize(s)}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${selectedSize === s ? "border-primary bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping info */}
                  <div className="glass border border-border/40 rounded-xl p-4 text-sm space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-4 w-4 text-primary" />
                      Szállítás: {formatPrice(shippingPrice)}
                      {isFreeShipping && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Ingyenes!</Badge>}
                    </div>
                    {settings?.free_shipping_above && (
                      <p className="text-muted-foreground/70">
                        Ingyenes szállítás {formatPrice(settings.free_shipping_above)} felett
                      </p>
                    )}
                  </div>

                  {/* Quantity + custom note */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Mennyiség</Label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-9 h-9 rounded-lg glass border border-border/50 hover:border-primary/50 flex items-center justify-center font-bold transition-all"
                        >–</button>
                        <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="w-9 h-9 rounded-lg glass border border-border/50 hover:border-primary/50 flex items-center justify-center font-bold transition-all"
                        >+</button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Egyedi kérés / megjegyzés a termékhez</Label>
                      <Textarea
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Pl. egyedi felirat, méret, szín..."
                        className="mt-1.5 glass border-border/50 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Price summary */}
                  <div className="glass border border-primary/20 rounded-xl p-4 space-y-1.5">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Részösszeg ({quantity} db)</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Szállítás</span>
                      <span className={isFreeShipping ? "text-green-400 line-through" : ""}>{formatPrice(shippingPrice)}</span>
                    </div>
                    {isFreeShipping && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Ingyenes szállítás kedvezmény</span>
                        <span>-{formatPrice(shippingPrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-foreground text-base border-t border-border/40 pt-1.5 mt-1.5">
                      <span>Összesen</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Selected variant summary */}
                  {(selectedSize || selectedGender) && (
                    <div className="glass border border-primary/20 rounded-xl px-4 py-3 text-sm flex flex-wrap gap-3">
                      {selectedGender && (
                        <span className="text-muted-foreground">Típus: <span className="text-foreground font-medium">{selectedGender}</span></span>
                      )}
                      {selectedSize && (
                        <span className="text-muted-foreground">Méret: <span className="text-foreground font-medium">{selectedSize}</span></span>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => product.in_stock && handleDetailsNext()}
                    disabled={!product.in_stock}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground neon-glow font-bold py-6 text-base"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    {product.in_stock ? "Megrendelés" : "Elfogyott"}
                  </Button>
                </>
              )}

              {step === "order" && (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleOrder(); }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setStep("details")} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-bold text-foreground">Rendelési adatok</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Teljes név *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1 glass border-border/50" placeholder="Kovács János" />
                      {errors.name && <p className="text-destructive text-xs mt-0.5">{errors.name}</p>}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>E-mail *</Label>
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 glass border-border/50" placeholder="email@example.com" />
                      {errors.email && <p className="text-destructive text-xs mt-0.5">{errors.email}</p>}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Telefonszám</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 glass border-border/50" placeholder="+36 30 123 4567" />
                    </div>
                  </div>

                  {/* Shipping method */}
                  <div>
                    <Label className="mb-2 block">Szállítási mód</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "post", label: "Postai szállítás", icon: <Truck className="h-5 w-5" />, price: `+${formatPrice(settings?.shipping_price || 1500)}` },
                        { v: "personal", label: "Személyes átvétel", icon: <Package className="h-5 w-5" />, price: "Ingyenes" },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setForm({ ...form, shipping: opt.v })}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm transition-all ${form.shipping === opt.v ? "border-primary bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                        >
                          {opt.icon}
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-primary">{opt.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address (only for post) */}
                  {form.shipping === "post" && (
                    <div className="space-y-3">
                      <div>
                        <Label>Cím *</Label>
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="mt-1 glass border-border/50" placeholder="Fő utca 1." />
                        {errors.address && <p className="text-destructive text-xs mt-0.5">{errors.address}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Irányítószám *</Label>
                          <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })}
                            className="mt-1 glass border-border/50" placeholder="1234" />
                          {errors.zip && <p className="text-destructive text-xs mt-0.5">{errors.zip}</p>}
                        </div>
                        <div>
                          <Label>Város *</Label>
                          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="mt-1 glass border-border/50" placeholder="Budapest" />
                          {errors.city && <p className="text-destructive text-xs mt-0.5">{errors.city}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  <div>
                    <Label className="mb-2 block">Fizetési mód</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "transfer", label: "Banki átutalás", icon: <CreditCard className="h-5 w-5" /> },
                        { v: "cash", label: "Készpénz (személyes)", icon: <Package className="h-5 w-5" /> },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setForm({ ...form, payment: opt.v })}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm transition-all ${form.payment === opt.v ? "border-primary bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                        >
                          {opt.icon}
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    {form.payment === "transfer" && settings?.bank_account && (
                      <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Átutalás adatai:</p>
                        <p>Bank: {settings.bank_name}</p>
                        <p>Számlatulajdonos: {settings.bank_account_holder}</p>
                        <p>Számlaszám: <span className="font-mono text-foreground">{settings.bank_account}</span></p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Megjegyzés a rendeléshez</Label>
                    <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                      className="mt-1 glass border-border/50 resize-none" rows={2} placeholder="Bármilyen egyéb kérés..." />
                  </div>

                  {/* Summary */}
                  <div className="glass border border-primary/20 rounded-xl p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {product.name} × {quantity}
                        {selectedGender && <span className="text-foreground"> · {selectedGender}</span>}
                        {selectedSize && <span className="text-foreground"> · {selectedSize}</span>}
                      </span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Szállítás</span>
                      <span>{formatPrice(form.shipping === "personal" ? 0 : (isFreeShipping ? 0 : shippingPrice))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-1.5">
                      <span>Összesen</span>
                      <span className="text-primary text-base">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={placeOrder.isPending}
                    className="w-full bg-primary hover:bg-primary/90 neon-glow font-bold py-6 text-base"
                  >
                    {placeOrder.isPending ? "Feldolgozás..." : "Rendelés leadása"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShopProduct;
