
-- Create media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Allow public read access to media
CREATE POLICY "Media images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow admins to upload media
CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete media
CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update media
CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));
