-- Add view_count to animes for trending feature
ALTER TABLE public.animes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Secure function to increment view count (callable by anyone)
CREATE OR REPLACE FUNCTION public.increment_anime_view(p_anime_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.animes
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_anime_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_anime_view(UUID) TO anon, authenticated;
