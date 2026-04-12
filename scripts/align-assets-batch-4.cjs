const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const mappings = [
  { id: '44f17d93-fc49-4090-8d75-eaeb6e0b6b6d', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // Espirometria Incentivada
  { id: '9f6cddd0-664a-465e-adc7-e587571df522', path: '/exercises/illustrations/ankle-inversion-isometric.avif' }, // Eversão
  { id: 'cd0ea681-c92c-4006-bdd7-5afc3c868bab', path: '/exercises/illustrations/wall-angels.avif' }, // Exercício de Parede para Ombro
  { id: 'a846b647-74f5-41e5-a583-8147cbd61919', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // Expansão Torácica
  { id: '5d1ccf64-73d9-46e1-a95b-c535dc634b1d', path: '/exercises/illustrations/alongamento-de-triceps-por-tras.avif' }, // Extensão Cotovelo
  { id: '88c5043c-6ddb-42a6-99b5-96cd3a3ec56b', path: '/exercises/illustrations/alongamento-de-triceps-por-tras.avif' }, // Extensão Cotovelo Garrafa
  { id: '6b3ea758-f4cd-4c6a-bb1b-7f9732d3510d', path: '/exercises/illustrations/coordenacao-digital-dedos.avif' }, // Extensão Dedos
  { id: 'c773d10f-e2ed-4ca6-864a-f355a83ceeda', path: '/exercises/illustrations/flexao-braco.avif' }, // Flexão Braço Parede
  { id: '44026881-f395-43b1-8437-87a747671833', path: '/exercises/illustrations/towel-wring-grip.avif' }, // Flexão Punho
  { id: 'e3b2b395-8c80-4ad0-a9d1-62170cd41446', path: '/exercises/illustrations/flexao-quadril-pe.avif' }, // Flexão Quadril com Vassoura
  { id: '92c07ed7-e61c-43c4-8651-08a34ca3e1fe', path: '/exercises/illustrations/marcha-paralela.avif' }, // Gait Training
  { id: '59933cf5-7599-43de-8f69-606575f91b4f', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // Huff Cough
  { id: '3772c13d-9a3f-4938-96e4-b33d725e4346', path: '/exercises/illustrations/ankle-inversion-isometric.avif' }, // Inversão
  { id: 'e93d18c5-6f31-4f4b-b76f-da556d762cb4', path: '/exercises/illustrations/chin-tucks.avif' }, // Isometria Cervical Ext
  { id: '9eec7ecd-e16c-491a-9843-45c9fb9b3eeb', path: '/exercises/illustrations/chin-tucks.avif' }, // Isometria Cervical Incl
  { id: 'f32367e8-ce7e-45a4-ae5e-a8a3eb0056bf', path: '/exercises/illustrations/agachamento-livre.avif' }, // Leg Press 45
  { id: 'a7a80b05-0723-4c52-97c2-4e6689371143', path: '/exercises/illustrations/lunge-lunges.avif' }, // Lunge com Rotação
  { id: '55be11db-c9c8-482f-bc30-f0e57f4e7b72', path: '/exercises/illustrations/marcha-paralela.avif' }, // Marcha Estacionária
  { id: '61ab52c6-cdf5-406b-b940-d7dbbfcecc05', path: '/exercises/illustrations/mobilizacao-tornozelo-df.avif' }, // Mobilidade Tornozelo
  { id: 'bf106c3d-7d51-413c-a7e7-c8d77c018949', path: '/exercises/illustrations/fortalecimento-intrinsecos-pe.avif' }, // Mobilidade Hálux
  { id: '32ab5f26-a92f-476d-98a2-8d461d45bb39', path: '/exercises/illustrations/elevacao-perna-reta.avif' }, // Slump
  { id: 'bf4208a8-e581-42a2-8ada-8c58cf610e70', path: '/exercises/illustrations/coordenacao-digital-dedos.avif' }, // Oposição Dedos
  { id: '89fe1888-aa91-4dbb-9372-64b702e67aa0', path: '/exercises/illustrations/retracao-escapular.avif' }, // Pallof Press
  { id: '26b81426-b061-4050-a7d2-a77eb62208c4', path: '/exercises/illustrations/ponte-unipodal.avif' }, // Ponte Glúteo Uni
  { id: 'deafbb28-b240-4e10-8d9a-26e76609f627', path: '/exercises/illustrations/alongamento-de-romboides-na-parede.avif' }, // Postura Criança
  { id: '524dca2d-cf76-4bbe-b68e-745859dc402d', path: '/exercises/illustrations/agachamento-isometrico.avif' }, // Prancha Parede
  { id: 'eee9e338-9f83-45b1-b27a-2280f370a73b', path: '/exercises/illustrations/fortalecimento-intrinsecos-pe.avif' }, // Preensão Toalha
  { id: '81f95733-aa81-4bde-8c4a-25adc832dcbb', path: '/exercises/illustrations/deadlift_dumbbells.avif' }, // RDL
  { id: 'a69f1946-6f77-4840-a737-6eb4089e3c60', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // Jacobson
  { id: '54a5abf8-892a-4ee7-a1ba-860b956e7eb7', path: '/exercises/illustrations/retracao-escapular.avif' }, // Barbell Row
  { id: '0c71c989-d905-4617-a92f-cc32de6cce87', path: '/exercises/illustrations/retracao-escapular.avif' }, // Remada Sentada
  { id: 'ddb808f5-5ab5-49ca-bfe4-31f7e641582e', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // 4-7-8
  { id: '00b03826-fd00-4741-b4ba-3fe06c71cc34', path: '/exercises/illustrations/respiracao-diafragmatica.avif' }, // Costal Inf
  { id: 'f31824d4-ce62-4c4a-80ea-2b248041de7d', path: '/exercises/illustrations/mobilidade-coluna-sentado.avif' }, // Rotação Torácica Sentado
  { id: '9da8f08b-1db1-49fd-980f-8f8c2a923989', path: '/exercises/illustrations/retracao-escapular.avif' }, // Rowing Elástico
  { id: '22f56dfc-0802-4828-b5ce-bcb1ec61c87a', path: '/exercises/illustrations/elevacao-perna-reta.avif' }, // SLR
  { id: 'ca4e687d-07b7-4a5f-a92d-27a7c366da65', path: '/exercises/illustrations/sit_to_stand_chair.avif' }, // Sit-to-Stand
  { id: '205ef2f5-83b5-41c0-932b-d6e8b8a53f29', path: '/exercises/illustrations/jump-squat.avif' }, // Squat Jump
  { id: 'e7f16c0f-7597-42b1-acfd-cce87575fd23', path: '/exercises/illustrations/step-up-frontal.avif' }, // Subida Escada
  { id: '68efc336-a02f-4fb8-9f05-00afb97207c3', path: '/exercises/illustrations/cobra-prona.avif' }, // Superman
  { id: 'd5ca93dc-44da-45eb-8de1-c139b2bee50d', path: '/exercises/illustrations/alongamento-de-psoas-lunge-stretch.avif' } // World's Greatest
];

async function align() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to Neon DB');

    for (const mapping of mappings) {
      const res = await client.query(
        'UPDATE exercises SET image_url = $1, updated_at = NOW() WHERE id = $2',
        [mapping.path, mapping.id]
      );
      if (res.rowCount > 0) {
        console.log(`Updated: ${mapping.id} -> ${mapping.path}`);
      } else {
        console.warn(`Record not found or already updated: ${mapping.id}`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

align();
