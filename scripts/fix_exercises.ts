import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log("Conectado ao Neon DB (Production)");

    // Fix Mobilidade de Quadril
    const res1 = await client.query(`
      UPDATE exercises 
      SET 
        "video_url" = 'https://www.youtube.com/watch?v=vV_yF6_FpKw',
        "image_url" = 'https://media.moocafisio.com.br/exercises/hip_mobility_exercise_1.jpg'
      WHERE name LIKE '%Mobilidade de Quadril (Rotação Interna Alternada)%'
      RETURNING id, name;
    `);
    
    console.log("Atualizado Mobilidade de Quadril:", res1.rows);

    // Fix Flexão de Braço
    const res2 = await client.query(`
      UPDATE exercises 
      SET 
        "video_url" = 'https://www.youtube.com/watch?v=IODxDxX7oi4',
        "image_url" = 'https://media.moocafisio.com.br/exercises/pushup_exercise_1.jpg'
      WHERE name = 'Flexão de Braço'
      RETURNING id, name;
    `);

    console.log("Atualizado Flexão de Braço:", res2.rows);

  } catch (error) {
    console.error("Erro na atualização:", error);
  } finally {
    await client.end();
    console.log("Conexão encerrada.");
  }
}

main();
