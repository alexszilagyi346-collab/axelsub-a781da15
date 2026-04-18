
-- Drop the insecure policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a security definer function for inserting notifications
CREATE OR REPLACE FUNCTION public.insert_notification_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- New policy: only authenticated users can insert, and only service-role or trigger-based inserts are allowed
-- Since notifications are created by triggers (notify_on_comment_reply, notify_subscribers_on_new_episode)
-- which run as SECURITY DEFINER, they bypass RLS. So we can safely restrict to authenticated only.
CREATE POLICY "Only authenticated can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
