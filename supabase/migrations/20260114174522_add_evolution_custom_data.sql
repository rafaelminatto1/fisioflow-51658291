-- Migration: Add custom_data column to evolution_measurements
-- Description: Stores dynamic custom fields for measurements when using Personalized type or templates.

ALTER TABLE public.evolution_measurements 
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.evolution_measurements.custom_data IS 'Stores dynamic custom fields for measurements when using Personalized type or templates.';
