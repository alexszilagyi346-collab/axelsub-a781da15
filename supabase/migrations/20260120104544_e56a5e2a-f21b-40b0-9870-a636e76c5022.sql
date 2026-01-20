
-- =============================================
-- 1. WATCH HISTORY - Nézési előzmények
-- =============================================
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch history"
ON public.watch_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
ON public.watch_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
ON public.watch_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
ON public.watch_history FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 2. FAVORITES - Kedvencek
-- =============================================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3. WATCHLIST - Megnézendők listája
-- =============================================
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
ON public.watchlist FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist"
ON public.watchlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
ON public.watchlist FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
ON public.watchlist FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 4. COMMENTS - Kommentek
-- =============================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_spoiler BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are publicly readable"
ON public.comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
ON public.comments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. RATINGS - Értékelések
-- =============================================
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are publicly readable"
ON public.ratings FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own ratings"
ON public.ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.ratings FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 6. PROFILES tábla bővítése
-- =============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS total_watch_time_minutes INTEGER DEFAULT 0;

-- =============================================
-- 7. ANIMES tábla bővítése (szűréshez)
-- =============================================
ALTER TABLE public.animes 
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing',
  ADD COLUMN IF NOT EXISTS episodes_count INTEGER;

-- =============================================
-- 8. Updated_at trigger a watchlist és comments táblákhoz
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watchlist_updated_at
BEFORE UPDATE ON public.watchlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 9. Indexek a gyorsabb lekérdezésekhez
-- =============================================
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_anime_id ON public.watch_history(anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON public.watch_history(last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON public.comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_ratings_anime_id ON public.ratings(anime_id);
CREATE INDEX IF NOT EXISTS idx_animes_year ON public.animes(year);
CREATE INDEX IF NOT EXISTS idx_animes_status ON public.animes(status);
CREATE INDEX IF NOT EXISTS idx_animes_genre ON public.animes(genre);
