-- Migration: Corrigir nomes de exercícios com formatação incorreta
-- Data: 2025-01-14
-- Descrição: Corrige erros de digitação e formatação nos nomes dos exercícios

-- Corrigir nomes dos exercícios
UPDATE exercises SET name = 'Agachamento Parede (Wall Sit)' WHERE name = 'Agachamento Parelde Wall Sit)';
UPDATE exercises SET name = 'Prancha Abdominal (Plank)' WHERE name = 'Prancha Abdominal Plank)';
UPDATE exercises SET name = 'Side Plank (Prancha Lateral)' WHERE name = 'Side Plank Prancha Lateral)';
UPDATE exercises SET name = '4 Apoios (Four Point kneeling)' WHERE name = '4 Apoios Four Point kneeling)';
UPDATE exercises SET name = 'Bird-dog (Cachorro e Pássaro)' WHERE name = 'Bird-dog Cachorro e Pássaro)';
UPDATE exercises SET name = 'Gato-Vaca (Cat-Cow)' WHERE name = 'Gato-Vaca Cat-Cow)';
UPDATE exercises SET name = 'Tandem Walk (Caminhada em Tandem)' WHERE name = 'Tandem Walk Caminhada em Tandem)';
UPDATE exercises SET name = 'Clamshell (Concha)' WHERE name = 'Clamshell Concha)';
UPDATE exercises SET name = 'Monster Walk (Caminhada Monster)' WHERE name = 'Monster Walk Caminhada Monster)';
UPDATE exercises SET name = 'Afundo Frontal (Lunge)' WHERE name = 'Afundo Frontal Lunge)';
UPDATE exercises SET name = 'Deadlift (Levantamento Terra) com Halteres' WHERE name = 'Deadlift Levantamento Terra) com Halteres';
UPDATE exercises SET name = 'RDL (Romanian Deadlift)' WHERE name = 'RDL Romanian Deadlift)';
UPDATE exercises SET name = 'Star Excursion Balance Test (SEBT)' WHERE name = 'Star Excursion Balance Test SEBT)';
UPDATE exercises SET name = 'Carrying de Carga (Farmer Walk)' WHERE name = 'Carrying de Carga Farmer Walk)';
UPDATE exercises SET name = 'Mobilização de Escápula (Wall Slides)' WHERE name = 'Mobilização de Escápula Wall Slides)';
UPDATE exercises SET name = 'Mobilização de Nervo Mediano (Tinel e Phalen)' WHERE name = 'Mobilização de Nervo Mediano Tinel e Phalen)';
UPDATE exercises SET name = 'Elevação Lateral de Ombro (0-90°)' WHERE name = 'Elevação Lateral de Ombro 0-90°)';
UPDATE exercises SET name = 'Flexão de Cotovelo (Bicep Curl)' WHERE name = 'Flexão de Cotovelo Bicep Curl)';
UPDATE exercises SET name = 'Squeeze de Bola (Espalmar)' WHERE name = 'Squeeze de Bola Espalmar)';
UPDATE exercises SET name = 'Coordenação Digital (Dedos)' WHERE name = 'Coordenação Digital Dedos)';
UPDATE exercises SET name = 'Alongamento de Panturrilha Sentado (Sóleo)' WHERE name = 'Alongamento de Panturrilha Sentado Sóleo)';
UPDATE exercises SET name = 'Mobilização de Nervo Ciático (Slump)' WHERE name = 'Mobilização de Nervo Ciático Slump)';
UPDATE exercises SET name = 'Mobilização de Quadril (Capsular)' WHERE name = 'Mobilização de Quadril Capsular)';
UPDATE exercises SET name = 'Alongamento de Psoas (Ilíaco)' WHERE name = 'Alongamento de Psoas Ilíaco)';
UPDATE exercises SET name = 'Respiração com Labios Franzidos (Pursed Lip)' WHERE name = 'Respiração com Labios Franzidos Pursed Lip)';
UPDATE exercises SET name = 'Extensão de Cotovelo (Tricep)' WHERE name = 'Extensão de Cotovelo Tricep)';
