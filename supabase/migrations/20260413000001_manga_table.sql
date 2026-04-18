CREATE TABLE IF NOT EXISTS public.mangas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  genre TEXT,
  author TEXT,
  status TEXT DEFAULT 'ongoing',
  chapters_count INTEGER,
  year INTEGER,
  is_featured BOOLEAN DEFAULT false,
  read_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mangas are publicly readable"
ON public.mangas FOR SELECT USING (true);

CREATE POLICY "Admins can insert mangas"
ON public.mangas FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update mangas"
ON public.mangas FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete mangas"
ON public.mangas FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_mangas_status ON public.mangas(status);
CREATE INDEX IF NOT EXISTS idx_mangas_genre ON public.mangas(genre);
