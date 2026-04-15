import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useShopProducts, useShopSettings } from "@/hooks/useShop";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Search, Tag, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollToTop from "@/components/ScrollToTop";

const CATEGORIES = ["Mind", "bögre", "póló", "pulóver", "egyéb"];

const formatPrice = (p: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(p);

const Shop = () => {
  const { data: products, isLoading } = useShopProducts();
  const { data: settings } = useShopSettings();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Mind");

  const filtered = products?.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Mind" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">

          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <h1
                className="text-4xl md:text-5xl font-black text-foreground neon-text"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                AxelSub Bolt
              </h1>
            </div>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Egyedi animés ajándéktárgyak — bögrék, pólók, pulóverek és még sok más saját mintával.
            </p>
            {settings?.free_shipping_above && (
              <p className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-sm font-medium px-4 py-2 rounded-full">
                <Tag className="h-4 w-4" />
                Ingyenes szállítás {formatPrice(settings.free_shipping_above)} felett!
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés a termékek között..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass border-border/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary neon-glow"
                      : "glass border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-4 mt-3 rounded" />
                  <Skeleton className="h-4 mt-1 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <Link to={`/shop/${product.id}`} className="group block">
                    <div className="relative aspect-square rounded-2xl overflow-hidden glass border border-border/50 group-hover:border-primary/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {!product.in_stock && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <Badge variant="secondary" className="text-sm font-bold">Elfogyott</Badge>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs capitalize bg-background/80 text-foreground border border-border/50">
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 px-1">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-primary font-bold mt-1">{formatPrice(product.price)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium">Nincs ilyen termék</p>
              <p className="text-sm mt-1">Próbálj más keresési feltételt</p>
            </div>
          )}
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
};

export default Shop;
