import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Clock, 
  Heart, 
  List, 
  History, 
  Camera,
  Edit2,
  Save,
  X,
  Film,
  Star,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AnimeCard from "@/components/AnimeCard";
import { useProfile, useUpdateProfile, useWatchStats, useUploadAvatar } from "@/hooks/useProfile";
import { useFavorites } from "@/hooks/useFavorites";
import { useWatchlist, watchlistStatusLabels, WatchlistStatus } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const StatCard = ({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
  >
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </motion.div>
);

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useWatchStats();
  const { data: favorites, isLoading: favoritesLoading } = useFavorites();
  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate("/");
    return null;
  }

  const handleEdit = () => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        bio,
      });
      setIsEditing(false);
      toast({ title: "Profil frissítve" });
    } catch (error) {
      toast({ title: "Hiba történt", variant: "destructive" });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar.mutateAsync(file);
      toast({ title: "Profilkép frissítve" });
    } catch (error) {
      toast({ title: "Hiba történt", variant: "destructive" });
    }
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} perc`;
    return `${hours} óra ${mins} perc`;
  };

  const isLoading = profileLoading || statsLoading || authLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6 md:p-8 mb-8"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-24 h-24 md:w-32 md:h-32">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                    {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4 max-w-md">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Megjelenítési név"
                    />
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Rövid bemutatkozás..."
                      className="resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={updateProfile.isPending} className="gap-2">
                        <Save className="w-4 h-4" />
                        Mentés
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                        <X className="w-4 h-4" />
                        Mégse
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {profile?.display_name || user?.email?.split("@")[0] || "Felhasználó"}
                    </h1>
                    {profile?.bio && (
                      <p className="text-muted-foreground mb-4">{profile.bio}</p>
                    )}
                    <Button variant="outline" onClick={handleEdit} className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Szerkesztés
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </>
            ) : (
              <>
                <StatCard
                  icon={Film}
                  label="Megtekintett epizód"
                  value={stats?.completedEpisodes || 0}
                  color="bg-primary/20 text-primary"
                />
                <StatCard
                  icon={Clock}
                  label="Összes nézési idő"
                  value={formatWatchTime(stats?.totalWatchTimeMinutes || 0)}
                  color="bg-blue-500/20 text-blue-500"
                />
                <StatCard
                  icon={Heart}
                  label="Kedvencek"
                  value={stats?.favoritesCount || 0}
                  color="bg-red-500/20 text-red-500"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Befejezett anime"
                  value={stats?.completedAnimes || 0}
                  color="bg-green-500/20 text-green-500"
                />
              </>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="favorites" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Kedvencek</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="gap-2">
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Listám</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Előzmények</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites">
              {favoritesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                  ))}
                </div>
              ) : favorites && favorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {favorites.map((fav) => fav.anime && (
                    <AnimeCard key={fav.id} anime={fav.anime as any} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Még nincsenek kedvenceid</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="watchlist">
              {watchlistLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                  ))}
                </div>
              ) : watchlist && watchlist.length > 0 ? (
                <div className="space-y-6">
                  {(["watching", "planned", "completed", "dropped"] as WatchlistStatus[]).map((status) => {
                    const items = watchlist.filter((w) => w.status === status);
                    if (items.length === 0) return null;
                    
                    return (
                      <div key={status}>
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                          {watchlistStatusLabels[status]} ({items.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {items.map((item) => item.anime && (
                            <AnimeCard key={item.id} anime={item.anime as any} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>A listád még üres</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>A részletes előzményekhez látogass el az</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/history")}
                  className="text-primary"
                >
                  Előzmények oldalra →
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
