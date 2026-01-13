-- Create exercise-videos storage bucket
-- This migration creates the storage bucket for exercise videos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exercise-videos',
    'exercise-videos',
    true, -- public for easy video playback
    104857600, -- 100MB limit per video (sufficient for exercise demos)
    ARRAY[
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'video/mpeg'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access for exercise videos
CREATE POLICY "Public videos are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercise-videos');

-- Policy: Authenticated users can upload exercise videos
CREATE POLICY "Authenticated users can upload exercise videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-videos');

-- Policy: Authenticated users can update exercise videos
CREATE POLICY "Authenticated users can update exercise videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-videos')
WITH CHECK (bucket_id = 'exercise-videos');

-- Policy: Authenticated users can delete exercise videos
CREATE POLICY "Authenticated users can delete exercise videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-videos');
