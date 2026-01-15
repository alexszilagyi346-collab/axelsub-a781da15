-- Make the animek bucket public for video streaming
UPDATE storage.buckets 
SET public = true 
WHERE id = 'animek';

-- Create storage policies for the animek bucket
CREATE POLICY "Animék nyilvánosan olvashatók"
ON storage.objects FOR SELECT
USING (bucket_id = 'animek');

CREATE POLICY "Authentikált felhasználók feltölthetnek"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'animek' AND auth.role() = 'authenticated');

CREATE POLICY "Authentikált felhasználók törölhetnek"
ON storage.objects FOR DELETE
USING (bucket_id = 'animek' AND auth.role() = 'authenticated');