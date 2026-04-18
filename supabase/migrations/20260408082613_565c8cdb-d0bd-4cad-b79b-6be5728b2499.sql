-- Allow admins to count all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all watch history for stats
CREATE POLICY "Admins can view all watch history"
ON public.watch_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));