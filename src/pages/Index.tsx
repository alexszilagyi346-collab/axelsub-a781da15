import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import AnimeGrid from "@/components/AnimeGrid";
import TrendingSection from "@/components/TrendingSection";
import ContinueWatching from "@/components/ContinueWatching";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollToTop from "@/components/ScrollToTop";
import { Link } from "react-router-dom";
import { BookOpen, Newspaper, MessageSquare, ArrowRight, ShoppingBag } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />

      <main className="pt-16 relative z-10">
        <HeroBanner />

        {/* Continue watching */}
        <ContinueWatching />

        {/* Glow divider */}
        <div className="section-glow-divider mx-auto max-w-4xl my-2" />

        {/* Trending */}
        <TrendingSection />

        {/* Glow divider */}
        <div className="section-glow-divider mx-auto max-w-4xl" />

        {/* Latest */}
        <AnimeGrid />

        {/* Quick nav cards */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link to="/manga" className="group flex items-center gap-4 p-5 rounded-2xl glass border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">Manga</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Magyar fordítású mangák</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link to="/news" className="group flex items-center gap-4 p-5 rounded-2xl glass border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <Newspaper className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">Hírek</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Legfrissebb anime hírek</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link to="/requests" className="group flex items-center gap-4 p-5 rounded-2xl glass border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">Kérések</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Kérj új animét vagy mangát</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link to="/shop" className="group flex items-center gap-4 p-5 rounded-2xl glass border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">Bolt</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Egyedi animés ajándékok</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ScrollToTop />

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 mt-6 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <span
                className="text-primary font-bold text-2xl neon-text block mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                AXELSUB
              </span>
              <p className="text-muted-foreground text-sm">
                Magyar feliratú animék és mangák egy helyen.
              </p>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link to="/browse" className="hover:text-foreground transition-colors">Animék</Link>
              <Link to="/manga" className="hover:text-foreground transition-colors">Manga</Link>
              <Link to="/news" className="hover:text-foreground transition-colors">Hírek</Link>
              <Link to="/requests" className="hover:text-foreground transition-colors">Kérések</Link>
            </nav>

            <p className="text-muted-foreground text-xs">
              © {new Date().getFullYear()} AxelSub
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
