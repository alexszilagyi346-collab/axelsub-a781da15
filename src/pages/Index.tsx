import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import AnimeGrid from "@/components/AnimeGrid";
import ContinueWatching from "@/components/ContinueWatching";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Content with top padding for fixed header */}
      <main className="pt-16">
        <ContinueWatching />
        <HeroBanner />
        <AnimeGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <span className="text-primary font-bold text-xl">AXELSUB</span>
          <p className="text-muted-foreground text-sm mt-2">
            © 2024 AxelSub. Minden jog fenntartva.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
