
-- Enable RLS (Usually enabled by default, skipping to avoid ownership error)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- Allow public access to view thumbnails
CREATE POLICY "Public Access to Thumbnails"
ON storage.objects FOR SELECT
USING ( bucket_id = 'exercise-thumbnails' );

-- Allow authenticated/anon users to upload thumbnails (for seed scripts)
-- In production, restrict this to authenticated admins
CREATE POLICY "Allow Uploads to Thumbnails"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'exercise-thumbnails' );

-- Allow updates
CREATE POLICY "Allow Updates to Thumbnails"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'exercise-thumbnails' );
