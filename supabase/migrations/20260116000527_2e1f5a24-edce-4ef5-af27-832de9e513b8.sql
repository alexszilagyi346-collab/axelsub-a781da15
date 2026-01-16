-- Create episodes table for anime episodes
CREATE TABLE public.episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title TEXT,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (anime_id, episode_number)
);

-- Enable Row Level Security
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Episodes are publicly readable"
ON public.episodes
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert episodes"
ON public.episodes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update episodes"
ON public.episodes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete episodes"
ON public.episodes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX idx_episodes_episode_number ON public.episodes(anime_id, episode_number);