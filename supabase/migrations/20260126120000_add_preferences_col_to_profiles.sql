-- Add preferences column to profiles table to store user-specific settings like UI layouts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
