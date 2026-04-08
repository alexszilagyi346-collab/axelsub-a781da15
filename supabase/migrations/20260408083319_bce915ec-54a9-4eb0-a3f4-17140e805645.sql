
-- Function to update episodes_count on animes table
CREATE OR REPLACE FUNCTION public.update_anime_episodes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.animes SET episodes_count = (
      SELECT COUNT(*) FROM public.episodes WHERE anime_id = OLD.anime_id
    ) WHERE id = OLD.anime_id;
    RETURN OLD;
  ELSE
    UPDATE public.animes SET episodes_count = (
      SELECT COUNT(*) FROM public.episodes WHERE anime_id = NEW.anime_id
    ) WHERE id = NEW.anime_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger on episodes table
CREATE TRIGGER update_episodes_count_trigger
AFTER INSERT OR DELETE ON public.episodes
FOR EACH ROW EXECUTE FUNCTION public.update_anime_episodes_count();

-- Backfill existing animes with correct episode counts
UPDATE public.animes SET episodes_count = (
  SELECT COUNT(*) FROM public.episodes WHERE episodes.anime_id = animes.id
);
