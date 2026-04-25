import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
  {
    slug: "prancha-abdominal",
    instructions:
      "### Guia Passo a Passo: Prancha Abdominal\n\n1.  **Posição Inicial**: Deite-se de bruços no chão.\n2.  **Apoio dos Antebraços**: Apoie os antebraços no chão, com os cotovelos alinhados diretamente abaixo dos ombros e as mãos apontando para frente, mantendo-os paralelos.\n3.  **Extensão das Pernas**: Estenda uma perna para trás e depois a outra, apoiando-se nas pontas dos pés. Mantenha os pés na largura dos ombros.\n4.  **Alinhamento Corporal**: Eleve o tronco e os quadris do chão, formando uma linha reta e contínua desde a cabeça até os calcanhares. Evite que o quadril caia ou se eleve demais.\n5.  **Ativação Muscular**: Contraia ativamente os músculos do abdômen, como se estivesse puxando o umbigo em direção à coluna. Mantenha os glúteos levemente contraídos.\n6.  **Respiração**: Mantenha o pescoço em posição neutra e respire de forma lenta e controlada, sem prender o ar.\n7.  **Sustentação**: Mantenha a posição pelo tempo determinado.",
    description:
      "Exercício isométrico fundamental para o fortalecimento do core, melhorando a estabilidade da coluna e a postura global.",
    tips: [
      "Mantenha o olhar para o chão para não sobrecarregar a cervical.",
      "A ativação dos glúteos ajuda a proteger a região lombar.",
      "Se tremer é sinal de que a musculatura está trabalhando; mantenha o controle.",
    ],
    precautions: [
      "Evite se houver dor lombar aguda ou hérnia de disco sintomática.",
      "Não recomendado para hipertensos não controlados devido à manobra de Valsalva involuntária.",
      "Gestantes devem ter acompanhamento específico.",
    ],
    benefits: [
      "Fortalecimento profundo do transverso abdominal.",
      "Melhora da estabilidade lombo-pélvica.",
      "Aumento da resistência muscular posturais.",
    ],
  },
  {
    slug: "sentar-levantar",
    instructions:
      "### Guia Passo a Passo: Sentar e Levantar da Cadeira\n\n1.  **Posicionamento**: Fique em pé à frente de uma cadeira estável, com os pés na largura dos ombros.\n2.  **Descida**: Inicie o movimento levando o quadril para trás como se fosse sentar, flexionando joelhos e quadris simultaneamente.\n3.  **Toque**: Desça até que os glúteos toquem levemente o assento da cadeira, sem relaxar totalmente o peso.\n4.  **Subida**: Empurre o chão com os calcanhares e retorne à posição em pé, estendendo totalmente os quadris.\n5.  **Braços**: Mantenha os braços cruzados sobre o peito ou estendidos à frente para equilíbrio.",
    description:
      "Exercício funcional básico e extremamente eficaz para fortalecer os membros inferiores e melhorar a independência motora.",
    tips: [
      "Mantenha os calcanhares sempre em contato com o solo.",
      "Não deixe os joelhos caírem para dentro durante a subida.",
      "Respire expire ao subir e inspire ao descer.",
    ],
    precautions: [
      "Certifique-se de que a cadeira não deslize (encoste-a na parede se necessário).",
      "Evite se houver dor fêmoro-patelar aguda que impeça a flexão.",
    ],
    benefits: [
      "Aumento da força de quadríceps e glúteos.",
      "Melhora da funcionalidade diária.",
      "Redução do risco de quedas em idosos.",
    ],
  },
];

async function updateExercises() {
  const sql = neon(DATABASE_URL);
  try {
    console.log(`🚀 Finalizando o enriquecimento (Batch Final - 2 exercícios)...`);

    for (const ex of enrichmentData) {
      const res = await sql`
        UPDATE exercises 
        SET 
          instructions = ${ex.instructions},
          description = ${ex.description},
          tips = ${ex.tips},
          precautions = ${ex.precautions},
          benefits = ${ex.benefits},
          updated_at = NOW()
        WHERE slug = ${ex.slug}
        RETURNING name
      `;

      if (res.length > 0) {
        console.log(`✅ Sucesso: ${res[0].name} (${ex.slug})`);
      } else {
        console.warn(`⚠️ Aviso: Exercício não encontrado para o slug ${ex.slug}`);
      }
    }

    console.log("✨ Enriquecimento finalizado com sucesso!");
  } catch (err) {
    console.error("❌ Erro durante o enriquecimento:", err);
  }
}

updateExercises();
