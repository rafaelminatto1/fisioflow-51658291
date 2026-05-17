-- 0083_backfill_exercise_media.sql
-- Sincroniza dados legados entre `exercises.image_url`/`exercises.video_url`
-- e a tabela relacional `exercise_media_attachments`.

-- (A) image_url legado → attachment (apenas se não houver attachment de imagem)
INSERT INTO exercise_media_attachments (
  exercise_id, type, url, caption, order_index
)
SELECT
  e.id,
  'image'::media_type,
  e.image_url,
  NULL,
  0
FROM exercises e
WHERE e.image_url IS NOT NULL
  AND e.image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM exercise_media_attachments ema
    WHERE ema.exercise_id = e.id AND ema.type = 'image'
  );

-- (A) video_url legado → attachment
INSERT INTO exercise_media_attachments (
  exercise_id, type, url, caption, order_index
)
SELECT
  e.id,
  CASE
    WHEN e.video_url ILIKE '%youtube.com%' OR e.video_url ILIKE '%youtu.be%'
      THEN 'youtube'::media_type
    ELSE 'video'::media_type
  END,
  e.video_url,
  NULL,
  COALESCE(
    (SELECT MAX(ema.order_index) + 1
       FROM exercise_media_attachments ema
       WHERE ema.exercise_id = e.id),
    1
  )
FROM exercises e
WHERE e.video_url IS NOT NULL
  AND e.video_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM exercise_media_attachments ema
    WHERE ema.exercise_id = e.id AND ema.type IN ('video', 'youtube')
  );

-- (B) image_url NULL mas existe attachment de imagem → preencher coluna legada
UPDATE exercises e
SET image_url = sub.url
FROM (
  SELECT DISTINCT ON (ema.exercise_id) ema.exercise_id, ema.url
  FROM exercise_media_attachments ema
  WHERE ema.type = 'image'
  ORDER BY ema.exercise_id, ema.order_index
) sub
WHERE e.id = sub.exercise_id
  AND (e.image_url IS NULL OR e.image_url = '');

-- (B) video_url NULL mas existe attachment de vídeo → preencher coluna legada
UPDATE exercises e
SET video_url = sub.url
FROM (
  SELECT DISTINCT ON (ema.exercise_id) ema.exercise_id, ema.url
  FROM exercise_media_attachments ema
  WHERE ema.type IN ('video', 'youtube')
  ORDER BY ema.exercise_id, ema.order_index
) sub
WHERE e.id = sub.exercise_id
  AND (e.video_url IS NULL OR e.video_url = '');
