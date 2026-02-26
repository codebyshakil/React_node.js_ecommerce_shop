-- Allow staff with media_upload permission to upload to media bucket
CREATE POLICY "Staff can upload media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND has_permission(auth.uid(), 'media_upload')
);

-- Allow staff with media_delete permission to delete from media bucket
CREATE POLICY "Staff can delete media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media' AND has_permission(auth.uid(), 'media_delete')
);

-- Allow staff with media_upload permission to update media
CREATE POLICY "Staff can update media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'media' AND has_permission(auth.uid(), 'media_upload')
);