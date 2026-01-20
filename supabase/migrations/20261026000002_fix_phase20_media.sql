
-- Migration to fix missing media for Phase 20 exercises (Upper Extremity & Cervical)
-- IDs retrieved from insert script output

-- 1. Extensão de Punho com Halter
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_extension_dumbbell_ortho_1768923874460.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_extension_dumbbell_ortho_1768923874460.png'
WHERE id = '1e4bbe8d-ac6e-4639-bc74-5d0de50998b0';

-- 2. Flexão de Punho com Halter
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_flexion_dumbbell_ortho_1768923890420.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_flexion_dumbbell_ortho_1768923890420.png'
WHERE id = 'e7d2ae17-25cf-4142-9ec3-603faea6a7cf';

-- 3. Pronação e Supinação com Peso
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_supination_pronation_hammer_1768923911585.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/wrist_supination_pronation_hammer_1768923911585.png'
WHERE id = 'a2d12c5a-8098-42e0-ba8e-6e8689248620';

-- 4. Torção de Toalha (Grip)
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/towel_twist_exercise_ortho_1768923977270.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/towel_twist_exercise_ortho_1768923977270.png'
WHERE id = 'a53d2a2e-90df-4e12-99d9-c34a687445ef';

-- 5. Isometria Cervical (Extensão)
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/cervical_isometric_extension_ortho_1768924022945.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/cervical_isometric_extension_ortho_1768924022945.png'
WHERE id = '02b467a9-564e-4a18-bbf5-8150154f50e0';

-- 6. Isometria Cervical (Inclinção Lateral)
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/cervical_isometric_side_flexion_ortho_1768924046187.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/cervical_isometric_side_flexion_ortho_1768924046187.png'
WHERE id = 'd83ab396-b53a-4983-8dd9-ba91994453ad';

-- 7. Chin Tuck com Elevação (Head Lift)
UPDATE exercises
SET 
  image_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/chin_tuck_head_lift_ortho_1768924061527.png',
  thumbnail_url = 'https://ycvbtjfrchcyvmkvuocu.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/chin_tuck_head_lift_ortho_1768924061527.png'
WHERE id = '13b4fac7-40e7-44d7-878d-d7613a9468bf';
