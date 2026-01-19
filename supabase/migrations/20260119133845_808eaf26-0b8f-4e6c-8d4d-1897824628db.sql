-- Add 360p quality column to episodes
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS quality_360p TEXT;