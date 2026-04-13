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

CREATE POLICY "Users can view own requests or admins view all"
  ON public.anime_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can insert own requests"
  ON public.anime_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can update requests"
  ON public.anime_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete requests"
  ON public.anime_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
