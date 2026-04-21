-- ============================================================
-- AXELSUB – Teljes adatbázis séma (biztonságos, újrafuttatható)
-- Másold be a Supabase SQL Editorba és futtasd le egyszerre
-- supabase.com/dashboard/project/[PROJEKT_ID]/sql/new
-- ============================================================

-- ============================================================
-- 1. APP ROLE ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'shop_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. PROFILES TÁBLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_watch_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. USER ROLES TÁBLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: profil auto-létrehozás regisztrációkor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. ANIMÉK TÁBLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.animes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  genre TEXT,
  year INTEGER,
  status TEXT DEFAULT 'ongoing',
  episodes_count INTEGER DEFAULT 0,
  last_episode_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Animék nyilvánosan olvashatók" ON public.animes;
DROP POLICY IF EXISTS "Admins can insert animes" ON public.animes;
DROP POLICY IF EXISTS "Admins can update animes" ON public.animes;
DROP POLICY IF EXISTS "Admins can delete animes" ON public.animes;

CREATE POLICY "Animék nyilvánosan olvashatók" ON public.animes FOR SELECT USING (true);
CREATE POLICY "Admins can insert animes" ON public.animes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update animes" ON public.animes FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can delete animes" ON public.animes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_animes_year ON public.animes(year);
CREATE INDEX IF NOT EXISTS idx_animes_status ON public.animes(status);
CREATE INDEX IF NOT EXISTS idx_animes_genre ON public.animes(genre);

CREATE OR REPLACE FUNCTION public.increment_anime_view(p_anime_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.animes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_anime_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_anime_view(UUID) TO anon, authenticated;

-- ============================================================
-- 5. EPIZÓDOK TÁBLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  video_url TEXT NOT NULL,
  op_start TEXT,
  op_end TEXT,
  ed_start TEXT,
  ed_end TEXT,
  backup_video_url TEXT,
  quality_360p TEXT,
  quality_480p TEXT,
  quality_720p TEXT,
  quality_1080p TEXT,
  subtitle_url TEXT,
  subtitle_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (anime_id, episode_number)
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Episodes are publicly readable" ON public.episodes;
DROP POLICY IF EXISTS "Admins can insert episodes" ON public.episodes;
DROP POLICY IF EXISTS "Admins can update episodes" ON public.episodes;
DROP POLICY IF EXISTS "Admins can delete episodes" ON public.episodes;

CREATE POLICY "Episodes are publicly readable" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number ON public.episodes(anime_id, episode_number);

CREATE OR REPLACE FUNCTION public.update_anime_episodes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

DROP TRIGGER IF EXISTS update_episodes_count_trigger ON public.episodes;
CREATE TRIGGER update_episodes_count_trigger
  AFTER INSERT OR DELETE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_anime_episodes_count();

-- ============================================================
-- 6. NÉZÉSI ELŐZMÉNYEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watch_history (
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

DROP POLICY IF EXISTS "Users can view their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can delete their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Admins can view all watch history" ON public.watch_history;

CREATE POLICY "Users can view their own watch history" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watch history" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watch history" ON public.watch_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watch history" ON public.watch_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all watch history" ON public.watch_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_anime_id ON public.watch_history(anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON public.watch_history(last_watched_at DESC);

-- ============================================================
-- 7. KEDVENCEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);

-- ============================================================
-- 8. MEGNÉZENDŐK LISTÁJA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can insert into their own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can update their own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete from their own watchlist" ON public.watchlist;

CREATE POLICY "Users can view their own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist" ON public.watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);

-- ============================================================
-- 9. KOMMENTEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
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

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;

CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.comments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON public.comments(episode_id);

-- ============================================================
-- 10. ÉRTÉKELÉSEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are publicly readable" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.ratings;

CREATE POLICY "Ratings are publicly readable" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings" ON public.ratings FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ratings_anime_id ON public.ratings(anime_id);

-- ============================================================
-- 11. UPDATED_AT TRIGGER FÜGGVÉNY
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_watchlist_updated_at ON public.watchlist;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

CREATE TRIGGER update_watchlist_updated_at BEFORE UPDATE ON public.watchlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 12. ÉRTESÍTÉSEK ÉS FELIRATKOZÁSOK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_episode', 'comment_reply', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE,
  related_episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  related_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anime_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Only authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Only authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.anime_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.anime_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.anime_subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON public.anime_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.anime_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.anime_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anime_subscriptions_user_id ON public.anime_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_anime_subscriptions_anime_id ON public.anime_subscriptions(anime_id);

CREATE OR REPLACE FUNCTION public.notify_subscribers_on_new_episode()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, related_anime_id, related_episode_id)
  SELECT s.user_id, 'new_episode', 'Új epizód érkezett!',
    (SELECT title FROM public.animes WHERE id = NEW.anime_id) || ' - ' || NEW.episode_number || '. epizód',
    '/anime/' || NEW.anime_id, NEW.anime_id, NEW.id
  FROM public.anime_subscriptions s WHERE s.anime_id = NEW.anime_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_new_episode_notify ON public.episodes;
CREATE TRIGGER on_new_episode_notify
  AFTER INSERT ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.notify_subscribers_on_new_episode();

CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE parent_user_id UUID; anime_title TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.comments WHERE id = NEW.parent_id;
    IF parent_user_id IS NOT NULL AND parent_user_id != NEW.user_id THEN
      SELECT title INTO anime_title FROM public.animes WHERE id = NEW.anime_id;
      INSERT INTO public.notifications (user_id, type, title, message, link, related_anime_id, related_comment_id)
      VALUES (parent_user_id, 'comment_reply', 'Válasz érkezett a kommentedre',
        'Valaki válaszolt a kommentedre: ' || anime_title,
        '/anime/' || NEW.anime_id, NEW.anime_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_comment_reply_notify ON public.comments;
CREATE TRIGGER on_comment_reply_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_reply();

-- ============================================================
-- 13. HÍREK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.news_posts (
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

DROP POLICY IF EXISTS "News posts are publicly readable" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can insert news posts" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can update news posts" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can delete news posts" ON public.news_posts;

CREATE POLICY "News posts are publicly readable" ON public.news_posts FOR SELECT USING (true);
CREATE POLICY "Admins can insert news posts" ON public.news_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update news posts" ON public.news_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can delete news posts" ON public.news_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_news_posts_updated_at ON public.news_posts;
CREATE TRIGGER update_news_posts_updated_at BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 14. OLDAL BEÁLLÍTÁSOK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value) VALUES
  ('facebook_url', ''), ('discord_url', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 15. MANGA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mangas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  genre TEXT,
  author TEXT,
  status TEXT DEFAULT 'ongoing',
  chapters_count INTEGER DEFAULT 0,
  year INTEGER,
  is_featured BOOLEAN DEFAULT false,
  read_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mangas are publicly readable" ON public.mangas;
DROP POLICY IF EXISTS "Admins can insert mangas" ON public.mangas;
DROP POLICY IF EXISTS "Admins can update mangas" ON public.mangas;
DROP POLICY IF EXISTS "Admins can delete mangas" ON public.mangas;

CREATE POLICY "Mangas are publicly readable" ON public.mangas FOR SELECT USING (true);
CREATE POLICY "Admins can insert mangas" ON public.mangas FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update mangas" ON public.mangas FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can delete mangas" ON public.mangas FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_mangas_status ON public.mangas(status);
CREATE INDEX IF NOT EXISTS idx_mangas_genre ON public.mangas(genre);

CREATE TABLE IF NOT EXISTS public.manga_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
  chapter_number NUMERIC(6,1) NOT NULL,
  title TEXT,
  page_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (manga_id, chapter_number)
);

ALTER TABLE public.manga_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chapters are publicly readable" ON public.manga_chapters;
DROP POLICY IF EXISTS "Admins can insert chapters" ON public.manga_chapters;
DROP POLICY IF EXISTS "Admins can update chapters" ON public.manga_chapters;
DROP POLICY IF EXISTS "Admins can delete chapters" ON public.manga_chapters;

CREATE POLICY "Chapters are publicly readable" ON public.manga_chapters FOR SELECT USING (true);
CREATE POLICY "Admins can insert chapters" ON public.manga_chapters FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can update chapters" ON public.manga_chapters FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can delete chapters" ON public.manga_chapters FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_manga_chapters_manga_id ON public.manga_chapters(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_chapters_number ON public.manga_chapters(manga_id, chapter_number);

CREATE OR REPLACE FUNCTION public.update_manga_chapters_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.mangas SET chapters_count = (SELECT COUNT(*) FROM public.manga_chapters WHERE manga_id = OLD.manga_id) WHERE id = OLD.manga_id;
    RETURN OLD;
  ELSE
    UPDATE public.mangas SET chapters_count = (SELECT COUNT(*) FROM public.manga_chapters WHERE manga_id = NEW.manga_id) WHERE id = NEW.manga_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_manga_chapters_count_trigger ON public.manga_chapters;
CREATE TRIGGER update_manga_chapters_count_trigger
  AFTER INSERT OR DELETE ON public.manga_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_manga_chapters_count();

-- ============================================================
-- 16. ANIME KÉRÉSEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.anime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.anime_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests or admins view all" ON public.anime_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.anime_requests;
DROP POLICY IF EXISTS "Admins and moderators can update requests" ON public.anime_requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON public.anime_requests;

CREATE POLICY "Users can view own requests or admins view all" ON public.anime_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Users can insert own requests" ON public.anime_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and moderators can update requests" ON public.anime_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins can delete requests" ON public.anime_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 17. BOLT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  images TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'egyéb',
  collection TEXT DEFAULT '',
  in_stock BOOLEAN DEFAULT true,
  stock_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read products" ON public.shop_products;
DROP POLICY IF EXISTS "Admin and shop_manager can manage products" ON public.shop_products;

CREATE POLICY "Anyone can read products" ON public.shop_products FOR SELECT USING (true);
CREATE POLICY "Admin and shop_manager can manage products" ON public.shop_products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')));

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_method TEXT DEFAULT 'post',
  payment_method TEXT DEFAULT 'transfer',
  status TEXT DEFAULT 'pending',
  total_price INTEGER NOT NULL,
  note TEXT,
  courier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admin and shop_manager can update orders" ON public.shop_orders;

CREATE POLICY "Users can insert own orders" ON public.shop_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own orders" ON public.shop_orders FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')));
CREATE POLICY "Admin and shop_manager can update orders" ON public.shop_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')));

CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shop_products(id),
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  custom_note TEXT
);

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.shop_order_items;
DROP POLICY IF EXISTS "Anyone can read order items" ON public.shop_order_items;

CREATE POLICY "Anyone can insert order items" ON public.shop_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read order items" ON public.shop_order_items FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_account_holder TEXT DEFAULT '',
  shipping_price INTEGER DEFAULT 1500,
  free_shipping_above INTEGER DEFAULT 15000,
  shop_email TEXT DEFAULT '',
  shop_phone TEXT DEFAULT '',
  shop_open BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Admin and shop_manager can update settings" ON public.shop_settings;

CREATE POLICY "Anyone can read shop settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Admin and shop_manager can update settings" ON public.shop_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'shop_manager')));

INSERT INTO public.shop_settings (bank_name, bank_account, bank_account_holder, shipping_price, free_shipping_above)
VALUES ('', '', '', 1500, 15000) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_shop_manager(p_email TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not found: %', p_email; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'shop_manager') ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_shop_manager(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'shop_manager'; END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_shop_manager(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_shop_manager(UUID) TO authenticated;

-- ============================================================
-- KÉSZ! Minden tábla, policy, trigger és függvény létrejött.
-- ============================================================
