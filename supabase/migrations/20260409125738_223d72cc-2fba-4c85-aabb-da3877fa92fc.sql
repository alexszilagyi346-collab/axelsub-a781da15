-- News posts table
CREATE TABLE public.news_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'announcement',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News posts are publicly readable"
ON public.news_posts FOR SELECT USING (true);

CREATE POLICY "Admins can insert news posts"
ON public.news_posts FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news posts"
ON public.news_posts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete news posts"
ON public.news_posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add last_episode_at to animes for sorting
ALTER TABLE public.animes ADD COLUMN IF NOT EXISTS last_episode_at TIMESTAMP WITH TIME ZONE;

-- Update existing animes with their latest episode date
UPDATE public.animes SET last_episode_at = sub.max_created
FROM (
  SELECT anime_id, MAX(created_at) as max_created
  FROM public.episodes
  GROUP BY anime_id
) sub
WHERE public.animes.id = sub.anime_id;

-- Update the trigger to also set last_episode_at
CREATE OR REPLACE FUNCTION public.update_anime_episodes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.animes SET 
      episodes_count = (SELECT COUNT(*) FROM public.episodes WHERE anime_id = OLD.anime_id),
      last_episode_at = (SELECT MAX(created_at) FROM public.episodes WHERE anime_id = OLD.anime_id)
    WHERE id = OLD.anime_id;
    RETURN OLD;
  ELSE
    UPDATE public.animes SET 
      episodes_count = (SELECT COUNT(*) FROM public.episodes WHERE anime_id = NEW.anime_id),
      last_episode_at = (SELECT MAX(created_at) FROM public.episodes WHERE anime_id = NEW.anime_id)
    WHERE id = NEW.anime_id;
    RETURN NEW;
  END IF;
END;
$$;