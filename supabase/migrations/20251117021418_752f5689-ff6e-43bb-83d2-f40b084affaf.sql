-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create storage policies for photo uploads
CREATE POLICY "Authenticated users can upload their photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) < 3
);

CREATE POLICY "Users can view all photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);