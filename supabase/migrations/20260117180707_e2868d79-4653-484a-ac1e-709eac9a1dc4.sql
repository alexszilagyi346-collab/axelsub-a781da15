-- Add new columns to episodes table for intelligent player features
ALTER TABLE public.episodes 
ADD COLUMN IF NOT EXISTS op_start TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS op_end TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ed_start TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ed_end TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS backup_video_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quality_480p TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quality_720p TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quality_1080p TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtitle_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtitle_type TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.episodes.op_start IS 'Opening start timestamp (format: mm:ss or hh:mm:ss)';
COMMENT ON COLUMN public.episodes.op_end IS 'Opening end timestamp (format: mm:ss or hh:mm:ss)';
COMMENT ON COLUMN public.episodes.ed_start IS 'Ending start timestamp (format: mm:ss or hh:mm:ss)';
COMMENT ON COLUMN public.episodes.ed_end IS 'Ending end timestamp (format: mm:ss or hh:mm:ss)';
COMMENT ON COLUMN public.episodes.backup_video_url IS 'Backup server video URL';
COMMENT ON COLUMN public.episodes.quality_480p IS '480p quality video URL';
COMMENT ON COLUMN public.episodes.quality_720p IS '720p quality video URL';
COMMENT ON COLUMN public.episodes.quality_1080p IS '1080p quality video URL';
COMMENT ON COLUMN public.episodes.subtitle_url IS 'External subtitle file URL (.ass or .srt)';
COMMENT ON COLUMN public.episodes.subtitle_type IS 'Subtitle type: embedded or external';