-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_episode', 'comment_reply', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE,
  related_episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  related_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anime_subscriptions table for episode notifications
CREATE TABLE public.anime_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.anime_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.anime_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.anime_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_anime_subscriptions_user_id ON public.anime_subscriptions(user_id);
CREATE INDEX idx_anime_subscriptions_anime_id ON public.anime_subscriptions(anime_id);

-- Function to create notification when new episode is added
CREATE OR REPLACE FUNCTION public.notify_subscribers_on_new_episode()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all subscribers of this anime
  INSERT INTO public.notifications (user_id, type, title, message, link, related_anime_id, related_episode_id)
  SELECT 
    s.user_id,
    'new_episode',
    'Új epizód érkezett!',
    (SELECT title FROM public.animes WHERE id = NEW.anime_id) || ' - ' || NEW.episode_number || '. epizód',
    '/anime/' || NEW.anime_id,
    NEW.anime_id,
    NEW.id
  FROM public.anime_subscriptions s
  WHERE s.anime_id = NEW.anime_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new episode notifications
CREATE TRIGGER on_new_episode_notify
  AFTER INSERT ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subscribers_on_new_episode();

-- Function to create notification when someone replies to a comment
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_user_id UUID;
  anime_title TEXT;
BEGIN
  -- Only notify if this is a reply (has parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    -- Get the parent comment's user_id
    SELECT user_id INTO parent_user_id FROM public.comments WHERE id = NEW.parent_id;
    
    -- Don't notify if replying to own comment
    IF parent_user_id IS NOT NULL AND parent_user_id != NEW.user_id THEN
      -- Get anime title
      SELECT title INTO anime_title FROM public.animes WHERE id = NEW.anime_id;
      
      -- Create notification
      INSERT INTO public.notifications (user_id, type, title, message, link, related_anime_id, related_comment_id)
      VALUES (
        parent_user_id,
        'comment_reply',
        'Válasz érkezett a kommentedre',
        'Valaki válaszolt a kommentedre: ' || anime_title,
        '/anime/' || NEW.anime_id,
        NEW.anime_id,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for comment reply notifications
CREATE TRIGGER on_comment_reply_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_reply();