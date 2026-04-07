import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import AnimeGrid from "@/components/AnimeGrid";
import ContinueWatching from "@/components/ContinueWatching";
import ParticleBackground from "@/components/ParticleBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />

      <main className="pt-16 relative z-10">
        <HeroBanner />
        
        {/* Continue watching - above latest */}
        <ContinueWatching />
        
        {/* Glow divider */}
        <div className="section-glow-divider mx-auto max-w-4xl my-2" />
        
        <AnimeGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mt-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <span
            className="text-primary font-bold text-xl neon-text"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            AXELSUB
          </span>
          <p className="text-muted-foreground text-sm mt-2">
            © 2024 AxelSub. Minden jog fenntartva.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
