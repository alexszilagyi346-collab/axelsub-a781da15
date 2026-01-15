-- Anime tábla létrehozása
CREATE TABLE public.animes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    genre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS engedélyezése
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;

-- Publikus olvasási policy - mindenki láthatja az animéket
CREATE POLICY "Animék nyilvánosan olvashatók"
ON public.animes
FOR SELECT
USING (true);

-- Admin beszúrás policy (később bővíthető)
CREATE POLICY "Authentikált felhasználók beszúrhatnak animét"
ON public.animes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin frissítés policy
CREATE POLICY "Authentikált felhasználók frissíthetnek animét"
ON public.animes
FOR UPDATE
TO authenticated
USING (true);

-- Admin törlés policy
CREATE POLICY "Authentikált felhasználók törölhetnek animét"
ON public.animes
FOR DELETE
TO authenticated
USING (true);