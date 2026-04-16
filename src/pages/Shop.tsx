import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useShopProducts, useShopSettings } from "@/hooks/useShop";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Search, Tag, Package, ArrowLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollToTop from "@/components/ScrollToTop";

const CATEGORIES = ["Mind", "póló", "pulóver", "bögre", "egyéb"];
const CAT_LABELS: Record<string, string> = {
  póló: "Pólók",
  pulóver: "Pulóverek",
  bögre: "Bögrék",
  egyéb: "Egyéb",
};

const formatPrice = (p: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(p);

interface ActiveFilter {
  category: string;
  collection: string;
}

const Shop = () => {
  const { data: products, isLoading } = useShopProducts();
  const { data: settings } = useShopSettings();
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState("Mind");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

  const allProducts = products || [];

  const isSearching = search.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.collection || "").toLowerCase().includes(q)
    );
  }, [allProducts, search]);

  const filteredByCategory = useMemo(() => {
    if (categoryTab === "Mind") return allProducts;
    return allProducts.filter((p) => p.category === categoryTab);
  }, [allProducts, categoryTab]);

  const groupedByCollection = useMemo(() => {
    const groups: Record<string, { category: string; collection: string; products: typeof allProducts }> = {};
    filteredByCategory.forEach((p) => {
      const col = p.collection?.trim() || "";
      const key = `${p.category}__${col}`;
      if (!groups[key]) {
        groups[key] = { category: p.category, collection: col, products: [] };
      }
      groups[key].products.push(p);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.collection.localeCompare(b.collection);
    });
  }, [filteredByCategory]);

  const collectionProducts = useMemo(() => {
    if (!activeFilter) return [];
    return allProducts.filter(
      (p) =>
        p.category === activeFilter.category &&
        (p.collection?.trim() || "") === activeFilter.collection
    );
  }, [allProducts, activeFilter]);

  const handleBack = () => setActiveFilter(null);

  const collectionTitle = activeFilter
    ? `${activeFilter.collection || "Egyéb"} – ${CAT_LABELS[activeFilter.category] || activeFilter.category}`
    : "";

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">

          {/* Hero */}
          <div className="text-center mb-10">
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

          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés sorozat, termék neve szerint..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveFilter(null); }}
              className="pl-10 glass border-border/50"
            />
          </div>

          {/* ── SEARCH RESULTS ── */}
          {isSearching && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Találatok: <span className="text-foreground font-medium">{searchResults.length} termék</span>
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-24 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium">Nincs találat</p>
                </div>
              ) : (
                <ProductGrid products={searchResults} />
              )}
            </div>
          )}

          {/* ── COLLECTION DETAIL VIEW ── */}
          {!isSearching && activeFilter && (
            <div>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Vissza
              </button>
              <h2 className="text-2xl font-black text-foreground mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {collectionTitle}
              </h2>
              <ProductGrid products={collectionProducts} />
            </div>
          )}

          {/* ── GROUPED OVERVIEW ── */}
          {!isSearching && !activeFilter && (
            <div>
              {/* Category tabs */}
              <div className="flex gap-2 flex-wrap mb-8">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryTab(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${
                      categoryTab === cat
                        ? "bg-primary text-primary-foreground border-primary neon-glow"
                        : "glass border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {cat === "Mind" ? "Mind" : CAT_LABELS[cat] || cat}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-square rounded-2xl" />
                      <Skeleton className="h-4 mt-3 rounded" />
                      <Skeleton className="h-4 mt-1 w-2/3 rounded" />
                    </div>
                  ))}
                </div>
              ) : groupedByCollection.length === 0 ? (
                <div className="text-center py-24 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium">Nincs termék ebben a kategóriában</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={categoryTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-10"
                  >
                    <CollectionGrid groups={groupedByCollection} onSelect={setActiveFilter} />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}

        </div>
      </main>
      <ScrollToTop />
    </div>
  );
};

// ── Collection Card Grid ──
const CollectionGrid = ({
  groups,
  onSelect,
}: {
  groups: { category: string; collection: string; products: ReturnType<typeof useShopProducts>["data"] }[];
  onSelect: (f: ActiveFilter) => void;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {groups.map((group, i) => {
      const prods = group.products || [];
      const coverImage = prods.find((p) => p.images && p.images.length > 0)?.images[0];
      const minPrice = Math.min(...prods.map((p) => p.price));
      const allOutOfStock = prods.every((p) => !p.in_stock);
      const label = group.collection || CAT_LABELS[group.category] || group.category;

      return (
        <motion.div
          key={`${group.category}__${group.collection}__${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
        >
          <button
            onClick={() => onSelect({ category: group.category, collection: group.collection })}
            className="group w-full text-left"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden glass border border-border/50 group-hover:border-primary/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
              {allOutOfStock && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm font-bold">Elfogyott</Badge>
                </div>
              )}
              {prods.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-0.5 text-xs font-medium text-foreground">
                  {prods.length} db
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge className="text-xs capitalize bg-background/80 text-foreground border border-border/50">
                  {CAT_LABELS[group.category] || group.category}
                </Badge>
              </div>
            </div>
            <div className="mt-3 px-1 flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {label}
                </h3>
                <p className="text-primary font-bold mt-1 text-sm">
                  {prods.length > 1 ? `${formatPrice(minPrice)}-tól` : formatPrice(minPrice)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
            </div>
          </button>
        </motion.div>
      );
    })}
  </div>
);

// ── Individual Product Grid ──
const ProductGrid = ({ products }: { products: ReturnType<typeof useShopProducts>["data"] }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {(products || []).map((product, i) => (
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
);

export default Shop;
