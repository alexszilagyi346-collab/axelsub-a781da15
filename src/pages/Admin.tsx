import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Loader2, 
  Trash2,
  Star,
  Edit,
  X
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useAnimes } from "@/hooks/useAnimes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Anime } from "@/types/anime";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: animes, isLoading: animesLoading, refetch } = useAnimes();
  
  const [showForm, setShowForm] = useState(false);
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    is_featured: false,
    video_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Skeleton className="w-48 h-8 mb-8" />
            <Skeleton className="w-full h-64" />
          </div>
        </main>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Hozzáférés megtagadva
            </h1>
            <p className="text-muted-foreground">
              Nincs admin jogosultságod ehhez az oldalhoz.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("animek")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("animek")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("A cím megadása kötelező!");
      return;
    }

    setUploading(true);

    try {
      let imageUrl = editingAnime?.image_url || null;

      // Upload image if selected
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, "images");
      }

      if (editingAnime) {
        // Update existing anime
        const { error } = await supabase
          .from("animes")
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            genre: formData.genre.trim() || null,
            is_featured: formData.is_featured,
            image_url: imageUrl,
            video_url: formData.video_url.trim() || null,
          })
          .eq("id", editingAnime.id);

        if (error) throw error;
        toast.success("Anime sikeresen frissítve!");
      } else {
        // Create new anime
        const { error } = await supabase
          .from("animes")
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            genre: formData.genre.trim() || null,
            is_featured: formData.is_featured,
            image_url: imageUrl,
            video_url: formData.video_url.trim() || null,
          });

        if (error) throw error;
        toast.success("Anime sikeresen hozzáadva!");
      }

      // Reset form
      setFormData({ title: "", description: "", genre: "", is_featured: false, video_url: "" });
      setImageFile(null);
      setImagePreview(null);
      setEditingAnime(null);
      setShowForm(false);
      refetch();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Hiba történt!");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (anime: Anime) => {
    setEditingAnime(anime);
    setFormData({
      title: anime.title,
      description: anime.description || "",
      genre: anime.genre || "",
      is_featured: anime.is_featured || false,
      video_url: anime.video_url || "",
    });
    setImagePreview(anime.image_url);
    setShowForm(true);
  };

  const handleDelete = async (anime: Anime) => {
    if (!confirm(`Biztosan törölni szeretnéd: "${anime.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("animes")
        .delete()
        .eq("id", anime.id);

      if (error) throw error;
      toast.success("Anime törölve!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Hiba a törlés során!");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", genre: "", is_featured: false, video_url: "" });
    setImageFile(null);
    setImagePreview(null);
    setEditingAnime(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground mt-1">Animék kezelése</p>
            </div>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Plus className="h-5 w-5" />
                Új anime
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {editingAnime ? "Anime szerkesztése" : "Új anime hozzáadása"}
                </h2>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Text Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Cím *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Anime címe"
                        className="bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="genre">Műfaj</Label>
                      <Input
                        id="genre"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        placeholder="pl. Akció, Kaland, Romantikus"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Leírás</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Anime leírása..."
                        className="bg-background min-h-[120px]"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        id="featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                      />
                      <Label htmlFor="featured" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        Kiemelt anime
                      </Label>
                    </div>
                  </div>

                  {/* Right Column - File Uploads */}
                  <div className="space-y-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>Borítókép</Label>
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors text-center"
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="h-10 w-10" />
                            <span>Kattints a kép feltöltéséhez</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Video URL */}
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Videó URL</Label>
                      <Input
                        id="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="https://example.com/video.mp4"
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Add meg a videó közvetlen URL-jét (mp4, webm, stb.)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 gap-2"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Feltöltés...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        {editingAnime ? "Mentés" : "Hozzáadás"}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Mégse
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Anime List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Animék ({animes?.length || 0})
              </h2>
            </div>

            {animesLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : animes?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Még nincs anime hozzáadva.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {animes?.map((anime) => (
                  <motion.div
                    key={anime.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {anime.image_url ? (
                        <img
                          src={anime.image_url}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {anime.title}
                        </h3>
                        {anime.is_featured && (
                          <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {anime.genre || "Nincs műfaj"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        {anime.video_url && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            Videó
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(anime)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(anime)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;