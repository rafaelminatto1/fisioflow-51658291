-- Create exercise_videos table
-- This table stores metadata for exercise demonstration videos

CREATE TABLE IF NOT EXISTS public.exercise_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration DECIMAL(10, 2),
  file_size BIGINT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'alongamento',
    'fortalecimento',
    'mobilidade',
    'equilíbrio',
    'coordenação',
    'postura',
    'respiração',
    'relaxamento'
  )),
  difficulty TEXT NOT NULL CHECK (difficulty IN (
    'iniciante',
    'intermediário',
    'avançado'
  )),
  body_parts TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercise_videos_exercise_id ON public.exercise_videos(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_category ON public.exercise_videos(category);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_difficulty ON public.exercise_videos(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_body_parts ON public.exercise_videos USING GIN(body_parts);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_equipment ON public.exercise_videos USING GIN(equipment);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_uploaded_by ON public.exercise_videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_created_at ON public.exercise_videos(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Authenticated users can view all exercise videos (public content)
CREATE POLICY "Authenticated users can view exercise videos"
ON public.exercise_videos FOR SELECT
TO authenticated
USING (true);

-- Public read access (if needed for patient portal)
CREATE POLICY "Public can view exercise videos"
ON public.exercise_videos FOR SELECT
TO public
USING (true);

-- Authenticated users can upload exercise videos
CREATE POLICY "Authenticated users can upload exercise videos"
ON public.exercise_videos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Users can update their own uploaded videos
CREATE POLICY "Users can update their own exercise videos"
ON public.exercise_videos FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by)
WITH CHECK (auth.uid() = uploaded_by);

-- Users can delete their own uploaded videos
CREATE POLICY "Users can delete their own exercise videos"
ON public.exercise_videos FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_exercise_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_videos_updated_at
  BEFORE UPDATE ON public.exercise_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_videos_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.exercise_videos IS 'Stores metadata for exercise demonstration videos uploaded by users';
COMMENT ON COLUMN public.exercise_videos.exercise_id IS 'Optional reference to the exercise this video demonstrates';
COMMENT ON COLUMN public.exercise_videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN public.exercise_videos.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.exercise_videos.body_parts IS 'Array of body parts targeted by this exercise';
COMMENT ON COLUMN public.exercise_videos.equipment IS 'Array of equipment needed for this exercise';
