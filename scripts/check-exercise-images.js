/**
 * Script para verificar as URLs das imagens dos exercícios no Firestore
 * Uso: node scripts/check-exercise-images.js
 */


// Cores para output

import { Firestore } from '@google-cloud/firestore';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function checkExerciseImages() {
  console.log(`${colors.cyan}Verificando imagens dos exercícios no Firestore...${colors.reset}\n`);

  // Inicializar Firestore
  const db = new Firestore({
    projectId: 'fisioflow-migration',
  });

  try {
    // Buscar exercícios
    const exercisesSnapshot = await db.collection('exercises').limit(20).get();

    console.log(`${colors.blue}Total de exercícios encontrados: ${exercisesSnapshot.size}${colors.reset}\n`);

    let withImage = 0;
    let withoutImage = 0;
    let withThumbnail = 0;
    let withVideo = 0;

    const sampleExercises = [];

    exercisesSnapshot.forEach((doc) => {
      const data = doc.data();
      const imageUrl = data.image_url || data.thumbnail_url || data.imageUrl || '';
      const videoUrl = data.video_url || data.videoUrl || '';

      if (imageUrl) {
        withImage++;
      } else {
        withoutImage++;
        sampleExercises.push({
          id: doc.id,
          name: data.name || 'Sem nome',
          image_url: imageUrl,
          thumbnail_url: data.thumbnail_url || '',
          imageUrl: data.imageUrl || '',
        });
      }

      if (data.thumbnail_url) withThumbnail++;
      if (videoUrl) withVideo++;
    });

    console.log(`${colors.green}✓ Com imagem: ${withImage}${colors.reset}`);
    console.log(`${colors.red}✗ Sem imagem: ${withoutImage}${colors.reset}`);
    console.log(`${colors.cyan}  Com thumbnail_url: ${withThumbnail}${colors.reset}`);
    console.log(`${colors.blue}  Com vídeo: ${withVideo}${colors.reset}\n`);

    if (sampleExercises.length > 0) {
      console.log(`${colors.yellow}Exemplos de exercícios SEM imagem:${colors.reset}`);
      sampleExercises.slice(0, 5).forEach((ex) => {
        console.log(`  - ${colors.cyan}${ex.name}${colors.reset} (ID: ${ex.id})`);
        console.log(`    image_url: ${ex.image_url || '(vazio)'}`);
        console.log(`    thumbnail_url: ${ex.thumbnail_url || '(vazio)'}`);
        console.log(`    imageUrl: ${ex.imageUrl || '(vazio)'}`);
      });
    }

    // Buscar amostra de exercícios COM imagem
    const withImageSample = await db.collection('exercises')
      .where('image_url', '!=', '')
      .limit(5)
      .get();

    if (!withImageSample.empty) {
      console.log(`\n${colors.green}Exemplos de exercícios COM imagem:${colors.reset}`);
      withImageSample.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${colors.cyan}${data.name || 'Sem nome'}${colors.reset} (ID: ${doc.id})`);
        console.log(`    image_url: ${data.image_url || '(vazio)'}`);
      });
    }

  } catch (error) {
    console.error(`${colors.red}Erro ao verificar exercícios:${colors.reset}`, error.message);
  }
}

checkExerciseImages();
