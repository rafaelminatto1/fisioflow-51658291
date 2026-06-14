import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

const newExercises = [
  {
    slug: "alongamento-psoas-avancado",
    name: "Alongamento de Psoas em Afundo (Half-Kneeling)",
    description: "Manobra de alongamento focada no músculo Iliopsoas. Desenvolvida para reduzir tensões na porção anterior do quadril, aliviar rigidez na região lombar e ampliar a flexibilidade articular da pelve.",
    instructions: "1. Ajoelhe-se com um joelho no chão (use um colchonete para conforto) e o outro pé à frente, formando um ângulo de 90 graus.\n2. Mantenha o tronco ereto e o core (abdômen) contraído.\n3. Projete o quadril levemente para a frente até sentir um alongamento na parte frontal da coxa e virilha da perna apoiada no chão.\n4. Mantenha a posição estática respirando profundamente durante todo o tempo estipulado.\n5. Troque de perna e repita.",
    tips: "A respiração profunda e lenta ajuda no relaxamento do músculo alvo. Evite hiperestender (arquear) a coluna lombar; o movimento deve vir da inclinação pélvica.",
    precautions: "Interrompa imediatamente se sentir dor aguda no joelho apoiado ou pinçamento profundo no quadril.",
    benefits: "Diminuição do tônus muscular do flexor do quadril, alívio de dor lombar associada a tensão no psoas e melhora na marcha e corrida.",
    equipment: ["Colchonete"],
    musclesPrimary: ["Iliopsoas", "Reto Femoral"],
    setsRecommended: 3,
    durationSeconds: 30,
    imageUrl: "/images/exercises/alongamento_psoas.png"
  },
  {
    slug: "mobilidade-toracica-rolo",
    name: "Mobilidade Torácica com Foam Roller",
    description: "Exercício de mobilidade ativa focado na coluna torácica, ideal para reverter posturas cifóticas do dia a dia e manter a saúde das articulações da coluna superior.",
    instructions: "1. Deite-se de barriga para cima com o rolo de liberação (foam roller) posicionado horizontalmente no meio das suas costas (região torácica).\n2. Dobre os joelhos, mantendo os pés apoiados no chão.\n3. Apoie a cabeça com as mãos cruzadas atrás da nuca, sem puxar o pescoço.\n4. Inspire e, ao expirar, deixe as costas e a cabeça caírem levemente para trás sobre o rolo, promovendo a extensão da coluna torácica.\n5. Retorne à posição inicial e repita, podendo rolar o foam roller um pouco mais para cima ou para baixo nas costas.",
    tips: "Foque na fluidez articular. O movimento deve ser como um 'óleo' nas engrenagens, nunca forçado com impacto. Não deixe a região lombar arquear excessivamente.",
    precautions: "Não coloque o rolo na região do pescoço (cervical) nem na parte inferior das costas (lombar). Apenas no meio das costas.",
    benefits: "Melhora da postura, aumento da expansibilidade da caixa torácica para respiração e alívio de dores em pescoço e ombros.",
    equipment: ["Foam Roller (Rolo de Liberação)"],
    musclesPrimary: ["Eretores da Espinha", "Paravertebrais Torácicos"],
    setsRecommended: 2,
    repsRecommended: 10,
    imageUrl: "/images/exercises/mobilidade_toracica.png"
  },
  {
    slug: "alongamento-grande-dorsal-parede",
    name: "Alongamento de Grande Dorsal na Parede",
    description: "Manobra de alongamento focada no músculo Grande Dorsal (Latissimus Dorsi). Desenvolvida para melhorar a amplitude de movimento de elevação dos braços e aliviar a tensão nos ombros e flancos.",
    instructions: "1. Fique em pé, de frente para uma parede, a uma distância de aproximadamente um braço e meio.\n2. Incline o tronco à frente a partir dos quadris e apoie as mãos espalmadas na parede, na altura ou um pouco acima da linha da cabeça.\n3. Deixe o peito afundar em direção ao chão, mantendo as costas retas e os braços esticados.\n4. Você deve sentir o alongamento nas laterais das costas (abaixo das axilas) e parte posterior dos ombros.\n5. Mantenha a posição pelo tempo indicado, respirando suavemente.",
    tips: "A respiração profunda e lenta ajuda no relaxamento do músculo alvo. Tente manter a lombar numa posição neutra (sem curvar demais).",
    precautions: "Se tiver alguma lesão prévia no ombro ou sentir sensação de luxação, evite afundar muito o peito.",
    benefits: "Melhor flexibilidade de membros superiores, alívio de tensões de postura de escritório e aumento da eficiência em movimentos acima da cabeça (overhead).",
    equipment: [],
    musclesPrimary: ["Latíssimo do Dorso", "Redondo Maior", "Tríceps (porção longa)"],
    setsRecommended: 3,
    durationSeconds: 30,
    imageUrl: "/images/exercises/alongamento_dorsal.png"
  },
  {
    slug: "alongamento-escalenos-ecom",
    name: "Alongamento de Escalenos e ECOM (Pescoço)",
    description: "Alongamento da musculatura antero-lateral do pescoço. Promove alívio imediato para cervicobraquialgias e tensões associadas ao estresse e uso prolongado de telas.",
    instructions: "1. Sente-se ou fique em pé com a coluna reta e os ombros relaxados (para baixo e para trás).\n2. Incline levemente a cabeça para um dos lados, como se quisesse encostar a orelha no ombro.\n3. Com a mão do lado para onde inclinou, faça uma leve pressão sobre o lado oposto da cabeça para aprofundar suavemente o alongamento.\n4. Para focar nos escalenos, leve a cabeça um pouco para trás e olhe sutilmente para cima.\n5. Mantenha a tração suave pelo tempo recomendado e depois troque de lado.",
    tips: "Não puxe a cabeça com força; o peso do braço costuma ser suficiente. Garanta que o ombro do lado que está sendo alongado não suba.",
    precautions: "A coluna cervical é sensível. Interrompa imediatamente se sentir tontura, irradiação severa ou dor aguda no pescoço.",
    benefits: "Redução de cefaleias tensionais, alívio do estresse crônico cervical e melhora da mobilidade do pescoço.",
    equipment: [],
    musclesPrimary: ["Escalenos", "Esternocleidomastóideo (ECOM)", "Trapézio Superior"],
    setsRecommended: 2,
    durationSeconds: 20,
    imageUrl: "/images/exercises/alongamento_escalenos.png"
  },
  {
    slug: "mobilidade-quadril-z-sit",
    name: "Mobilidade de Quadril em Z-Sit (90/90)",
    description: "Exercício de mobilidade ativa focado nas rotações interna e externa do quadril, ideal para soltar a cápsula articular pélvica e melhorar o conforto no agachamento profundo.",
    instructions: "1. Sente-se no chão. Dobre uma perna à sua frente em um ângulo de 90 graus (joelho e quadril a 90 graus, calcanhar alinhado ao joelho).\n2. Posicione a perna de trás dobrada de forma semelhante (quadril em rotação interna, joelho flexionado a 90 graus).\n3. Tente sentar de forma reta, empurrando o ísquio (osso do bumbum) de trás em direção ao chão o máximo possível, sem curvar as costas.\n4. Incline-se levemente à frente sobre a perna dianteira para um alongamento dos glúteos e da cápsula externa.\n5. Retorne e gire para o outro lado para focar na perna traseira.",
    tips: "Foque na fluidez articular. É normal sentir um lado muito mais rígido que o outro. Se não conseguir se manter ereto, apoie uma mão no chão para auxiliar.",
    precautions: "Pode ser desconfortável nos joelhos se houver histórico de menisco. Ajuste o ângulo fechando um pouco mais os joelhos se necessário.",
    benefits: "Aumento massivo do escopo de movimento do quadril, alívio de dores lombares secundárias a quadril rígido e melhor desempenho atlético.",
    equipment: ["Colchonete"],
    musclesPrimary: ["Glúteo Máximo", "Piriforme", "Rotadores Internos do Quadril"],
    setsRecommended: 3,
    durationSeconds: 30,
    imageUrl: "/images/exercises/mobilidade_quadril_z.png"
  }
];

async function insertNewExercises() {
  console.log("Inserindo novos exercícios...");
  let count = 0;
  for (const ex of newExercises) {
    // Insere, ignorando se houver algum erro de slug duplicado, mas estamos usando slugs únicos.
    await sql`
      INSERT INTO exercises (
        slug, name, description, instructions, tips, precautions, benefits, 
        equipment, muscles_primary, sets_recommended, duration_seconds, reps_recommended, image_url
      ) VALUES (
        ${ex.slug}, ${ex.name}, ${ex.description}, ${ex.instructions}, ${ex.tips}, ${ex.precautions}, ${ex.benefits},
        ${ex.equipment}, ${ex.musclesPrimary}, ${ex.setsRecommended || null}, ${ex.durationSeconds || null}, ${ex.repsRecommended || null}, ${ex.imageUrl}
      )
    `;
    count++;
  }
  console.log(`✅ ${count} Novos exercícios inseridos com sucesso!`);
}

insertNewExercises().catch(console.error).finally(() => process.exit(0));
