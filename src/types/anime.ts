export interface Anime {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  is_featured: boolean;
  genre: string | null;
  created_at: string;
}
