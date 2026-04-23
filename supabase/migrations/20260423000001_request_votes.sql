-- Anime request voting system
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/zdwhtyeqhhplpyqmnyiz/sql/new

-- 1) Votes table
CREATE TABLE IF NOT EXISTS public.anime_request_votes (
  request_id UUID NOT NULL REFERENCES public.anime_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_request_votes_request_id ON public.anime_request_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_anime_request_votes_user_id ON public.anime_request_votes(user_id);

ALTER TABLE public.anime_request_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read votes" ON public.anime_request_votes;
CREATE POLICY "Anyone authenticated can read votes"
  ON public.anime_request_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can vote" ON public.anime_request_votes;
CREATE POLICY "Users can vote"
  ON public.anime_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own vote" ON public.anime_request_votes;
CREATE POLICY "Users can remove own vote"
  ON public.anime_request_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) Allow all logged-in users to read all requests (so they can vote on them)
DROP POLICY IF EXISTS "Users can view own requests or admins view all" ON public.anime_requests;
DROP POLICY IF EXISTS "Anyone authenticated can view requests" ON public.anime_requests;
CREATE POLICY "Anyone authenticated can view requests"
  ON public.anime_requests FOR SELECT
  TO authenticated
  USING (true);
