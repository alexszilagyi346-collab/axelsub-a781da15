-- Manga fejezetek tábla
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

CREATE POLICY "Chapters are publicly readable"
ON public.manga_chapters FOR SELECT USING (true);

CREATE POLICY "Admins can insert chapters"
ON public.manga_chapters FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update chapters"
ON public.manga_chapters FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete chapters"
ON public.manga_chapters FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_manga_chapters_manga_id ON public.manga_chapters(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_chapters_number ON public.manga_chapters(manga_id, chapter_number);

-- Auto-update chapters_count on mangas when chapters change
CREATE OR REPLACE FUNCTION public.update_manga_chapters_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.mangas SET chapters_count = (
      SELECT COUNT(*) FROM public.manga_chapters WHERE manga_id = OLD.manga_id
    ) WHERE id = OLD.manga_id;
    RETURN OLD;
  ELSE
    UPDATE public.mangas SET chapters_count = (
      SELECT COUNT(*) FROM public.manga_chapters WHERE manga_id = NEW.manga_id
    ) WHERE id = NEW.manga_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER update_manga_chapters_count_trigger
AFTER INSERT OR DELETE ON public.manga_chapters
FOR EACH ROW EXECUTE FUNCTION public.update_manga_chapters_count();
