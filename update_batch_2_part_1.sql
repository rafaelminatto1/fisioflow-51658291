-- SCRIPT DE ATUALIZAÇÃO - LOTE 2 (PARTE 1)
-- ESTILO: HIPER-REALISTA 3D COM ANATOMIA PT-BR
-- DATA: 2026-04-24

-- NOTA: Substitua 'https://r2.fisioflow.com/assets/' pela URL real do seu bucket após o upload.

BEGIN;

-- 1. Agachamento Livre
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/agachamento_livre_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = '3f5ce2d6-5a7e-4bc2-b048-cd2144afee7b';

-- 2. Flexão de Braço (Push-up)
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/flexao_braco_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = 'a1d17d0d-8464-4a12-85b1-44e82251d1b0';

-- 3. Prancha Abdominal
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/prancha_abdominal_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = 'de6daecf-7e3a-497e-a9a9-41b6a97d3ed8';

-- 4. Afundo (Lunge)
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/afundo_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = '296c9330-4818-4cc4-9c77-ccd1030952ce';

-- 5. Elevação Pélvica (Glute Bridge)
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/elevacao_pelvica_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = '50d2fbe0-c7be-466b-a3bb-0c5e8c777feb';

-- 6. Panturrilha em Pé
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/panturrilha_em_pe_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = 'e61cabcd-f72e-47fe-adb7-a394d8bac445';

-- 7. Abdução de Quadril (Deitado)
UPDATE exercises 
SET "imageUrl" = 'https://r2.fisioflow.com/assets/abducao_quadril_3d_new_style.png',
    tags = array_cat(tags, ARRAY['IA_ASSISTED', '3D_ANATOMY'])
WHERE id = '07054143-f680-433b-8b93-22b64469bd58';

COMMIT;
