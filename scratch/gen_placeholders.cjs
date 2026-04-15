const exercises = [
  {
    "id": "ba6ce50d-fb5c-4c7c-bd0f-00aa21b04f3a",
    "name": "Alongamento de Tríceps Sentado",
    "description": "Exercício de alongamento focado no músculo tríceps braquial, essencial para a mobilidade do ombro e extensão do cotovelo.",
    "instructions": "1. Sente-se eretamente com os pés apoiados no chão.\\n2. Levante um braço e flexione o cotovelo, levando a mão em direção às costas.\\n3. Com a outra mão, empurre suavemente o cotovelo para baixo.\\n4. Mantenha a posição por 20-30 segundos e repita no outro lado.",
    "tips": ["Mantenha a coluna ereta", "Não force além do limite de conforto", "Respire profundamente durante o alongamento"],
    "precautions": ["Evite se tiver dor aguda no ombro", "Não incline o pescoço para a frente"],
    "benefits": ["Melhora a flexibilidade do braço", "Reduz tensões musculares no tríceps", "Aumenta a amplitude de movimento do ombro"],
    "body_parts": ["Membros Superiores", "Braço"],
    "equipment": ["Cadeira (opcional)"],
    "muscles": ["Tríceps braquial"]
  },
  {
    "id": "453deaf7-0275-47f9-9767-044202d2fc26",
    "name": "Rosca Bíceps Alternada",
    "description": "Exercício clássico para fortalecimento do bíceps, permitindo foco individual em cada braço e correção de assimetrias.",
    "instructions": "1. Em pé, segure um halter em cada mão ao lado do corpo.\\n2. Flexione um braço, trazendo o peso em direção ao ombro enquanto gira a palma para cima.\\n3. Desça o peso de forma controlada.\\n4. Repita o movimento com o outro braço.",
    "tips": ["Mantenha os cotovelos fixos ao lado do corpo", "Evite balançar o tronco", "Gire o punho apenas no meio do movimento"],
    "precautions": ["Não use cargas excessivas que comprometam a postura", "Cuidado com a hiperextensão do cotovelo na descida"],
    "benefits": ["Fortalecimento do bíceps braquial", "Melhora da simetria muscular", "Funcionalidade para atividades de vida diária"],
    "body_parts": ["Membros Superiores", "Braço"],
    "equipment": ["Halteres"],
    "muscles": ["Bíceps braquial", "Braquiorradial"]
  },
  {
    "id": "dbfc7f35-f427-497a-9cdb-0270c6285ada",
    "name": "Avanço com Halteres",
    "description": "Exercício multiarticular para fortalecimento de membros inferiores, com foco em quadríceps, glúteos e estabilidade.",
    "instructions": "1. Em pé, segure um halter em cada mão ao lado do corpo.\\n2. Dê um passo largo à frente e desça o quadril até que ambos os joelhos formem ângulos de 90 graus.\\n3. Mantenha o tronco ereto e o joelho de trás quase tocando o chão.\\n4. Retorne à posição inicial empurrando com a perna da frente.",
    "tips": ["Mantenha o olhar fixo à frente para equilíbrio", "O joelho da frente não deve ultrapassar a ponta do pé", "Mantenha o core ativado"],
    "precautions": ["Evite se tiver lesões agudas de menisco ou ligamento no joelho", "Cuidado com o equilíbrio lateral"],
    "benefits": ["Fortalecimento de quadríceps e glúteos", "Melhora do equilíbrio dinâmico", "Aumento da força funcional para caminhadas e subidas"],
    "body_parts": ["Membros Inferiores", "Coxa", "Glúteos"],
    "equipment": ["Halteres"],
    "muscles": ["Quadríceps femoral", "Glúteo máximo", "Isquiotibiais"]
  },
  {
    "id": "f451ae26-c34c-458d-8b0c-a992a11b343e",
    "name": "Avanço Isométrico",
    "description": "Variação do avanço que foca na resistência muscular e controle postural através da manutenção estática da posição.",
    "instructions": "1. Posicione-se em uma base de avanço (uma perna à frente da outra).\\n2. Desça o quadril até que o joelho da frente esteja a 90 graus.\\n3. Sustente essa posição imóvel pelo tempo determinado.\\n4. Mantenha o tronco vertical e o peso distribuído igualmente.",
    "tips": ["Respire normalmente, não prenda a respiração", "Foque na contração do glúteo da perna da frente", "Mantenha as mãos na cintura ou braços relaxados"],
    "precautions": ["Não deixe o joelho de trás colapsar no chão", "Interrompa se sentir dor articular aguda"],
    "benefits": ["Aumento da resistência muscular localizada", "Melhora da estabilidade lombo-pélvica", "Estímulo neuromuscular intenso"],
    "body_parts": ["Membros Inferiores", "Coxa"],
    "equipment": ["Peso corporal"],
    "muscles": ["Quadríceps femoral", "Glúteo médio", "Core"]
  },
  {
    "id": "50c862b1-a3e5-4303-8278-16d638011b1c",
    "name": "Barra Fixa Supinada",
    "description": "Exercício avançado de tração que enfatiza o bíceps e o latíssimo do dorso através da pegada com as palmas voltadas para o rosto.",
    "instructions": "1. Segure na barra com as palmas voltadas para você (supinação) na largura dos ombros.\\n2. Pendure-se com os braços estendidos.\\n3. Puxe o corpo para cima até que o queixo ultrapasse a linha da barra.\\n4. Desça de forma controlada até a extensão total.",
    "tips": ["Evite usar o balanço das pernas (kipping)", "Foque em puxar com os cotovelos para baixo", "Mantenha o peito aberto"],
    "precautions": ["Cuidado com o estresse excessivo nos tendões do bíceps", "Não solte o corpo bruscamente na descida"],
    "benefits": ["Desenvolvimento de força de tração", "Fortalecimento intenso de membros superiores", "Melhora da pegada (grip strength)"],
    "body_parts": ["Membros Superiores", "Costas", "Braço"],
    "equipment": ["Barra fixa"],
    "muscles": ["Bíceps braquial", "Latíssimo do dorso", "Braquial"]
  },
  {
    "id": "746bd71f-9b4a-4eb6-ade3-5d081c0d9e98",
    "name": "Alongamento de Romboides Sentado",
    "description": "Alongamento essencial para relaxar a musculatura entre as escápulas, frequentemente tensionada por má postura.",
    "instructions": "1. Sente-se em uma cadeira com os pés afastados.\\n2. Cruze os dedos das mãos e vire as palmas para fora.\\n3. Empurre as mãos para frente como se estivesse tentando tocar algo distante.\\n4. Curve levemente a parte superior das costas e abaixe o queixo.",
    "tips": ["Sinta as escápulas se afastarem uma da outra", "Mantenha os ombros relaxados e longe das orelhas", "Respire na região das costas"],
    "precautions": ["Não force o pescoço para baixo excessivamente", "Evite se houver hérnia de disco cervical aguda"],
    "benefits": ["Alívio de tensão escapular", "Melhora da postura cifótica", "Redução de dores tensionais no pescoço"],
    "body_parts": ["Costas", "Cintura Escapular"],
    "equipment": ["Cadeira"],
    "muscles": ["Romboides maior e menor", "Trapézio médio"]
  },
  {
    "id": "b523af33-89ff-4e35-a47c-b7b1a7c67540",
    "name": "Alongamento de Tríceps com Toalha",
    "description": "Variação do alongamento de tríceps que utiliza uma toalha para auxiliar quem possui mobilidade reduzida de ombro.",
    "instructions": "1. Segure uma toalha com uma mão e levante-a acima da cabeça.\\n2. Deixe a toalha cair pelas costas.\\n3. Segure a outra ponta da toalha com a mão livre por baixo (através da região lombar).\\n4. Puxe suavemente a toalha para baixo para alongar o braço superior.",
    "tips": ["Mantenha o cotovelo superior próximo à orelha", "Não curve a coluna lombar para compensar", "Use movimentos lentos"],
    "precautions": ["Evite em casos de capsulite adesiva severa (ombro congelado)", "Não force a mão de baixo excessivamente"],
    "benefits": ["Aumento da flexibilidade profunda do tríceps", "Melhora da mobilidade de ombro em rotação"],
    "body_parts": ["Membros Superiores", "Braço"],
    "equipment": ["Toalha"],
    "muscles": ["Tríceps braquial"]
  },
  {
    "id": "2b854366-2ddc-4edf-b157-d7881d4d9594",
    "name": "Avanço Reverso com Halteres",
    "description": "Variação do avanço que costuma ser mais confortável para os joelhos, mantendo o foco no fortalecimento de pernas e glúteos.",
    "instructions": "1. Em pé, com halteres nas mãos, dê um passo para TRÁS com uma das pernas.\\n2. Desça o joelho de trás em direção ao chão até formar 90 graus com a perna da frente.\\n3. Mantenha o tronco firme.\\n4. Empurre com a perna da frente para retornar à posição inicial.",
    "tips": ["Mantenha o peso no calcanhar do pé da frente", "A perna de trás serve apenas de apoio", "Excelente para trabalhar glúteos"],
    "precautions": ["Mantenha a estabilidade do tornozelo da frente"],
    "benefits": ["Fortalecimento de membros inferiores", "Menor impacto patelofemoral que o avanço frontal", "Melhora da coordenação motora"],
    "body_parts": ["Membros Inferiores", "Coxa"],
    "equipment": ["Halteres"],
    "muscles": ["Quadríceps femoral", "Glúteo máximo", "Ísquios"]
  },
  {
    "id": "90a7d17a-2a65-433a-b71e-fff217935641",
    "name": "Alongamento de Tríceps na Parede",
    "description": "Uso da parede como anteparo clínico para aprofundar o alongamento da cabeça longa do tríceps.",
    "instructions": "1. Fique de frente para uma parede e coloque o cotovelo contra ela, acima da linha da cabeça.\\n2. Apoie a mão nas próprias costas (ou na escápula).\\n3. Incline levemente o tronco para a frente, pressionando o cotovelo para cima na parede.\\n4. Sinta o alongamento ao longo da lateral do braço.",
    "tips": ["Mantenha o abdômen contraído para não arquear as costas", "Respire suavemente"],
    "precautions": ["Cuidado com a pressão excessiva no cotovelo se tiver bursite olecraniana"],
    "benefits": ["Alongamento profundo da cabeça longa do tríceps", "Melhora da flexão do ombro"],
    "body_parts": ["Membros Superiores", "Braço"],
    "equipment": ["Parede"],
    "muscles": ["Tríceps braquial"]
  },
  {
    "id": "abfebb68-22e8-4eb9-b1f9-90c0fd8862e8",
    "name": "Rosca Martelo",
    "description": "Exercício de flexão de cotovelo com pegada neutra, focando no músculo braquiorradial e braquial.",
    "instructions": "1. Em pé ou sentado, segure os halteres com as palmas voltadas uma para a outra (pegada neutra).\\n2. Flexione os cotovelos trazendo o peso em direção ao ombro.\\n3. Mantenha a posição neutra das mãos durante todo o movimento.\\n4. Retorne controladamente.",
    "tips": ["Não balance os ombros", "Aperte o halter com firmeza para ativar o antebraço"],
    "precautions": ["Cuidado com a fadiga do punho"],
    "benefits": ["Fortalecimento do antebraço e braço", "Redução de estresse no punho em comparação à rosca direta", "Desenvolvimento de força de 'pegada'"],
    "body_parts": ["Membros Superiores", "Antebraço", "Braço"],
    "equipment": ["Halteres"],
    "muscles": ["Braquiorradial", "Braquial", "Bíceps braquial"]
  },
  {
    "id": "94ed0c16-cb4e-4f24-812c-ada89aaa87cf",
    "name": "Barra Fixa Pronada",
    "description": "O clássico 'Pull-up', fundamental para a força funcional e saúde escapular.",
    "instructions": "1. Segure na barra com as palmas voltadas para frente (pronação) com as mãos mais largas que os ombros.\\n2. Puxe-se para cima tentando levar o peito à barra.\\n3. Mantenha os cotovelos apontando para fora/baixo.\\n4. Desça estendendo os braços quase totalmente.",
    "tips": ["Retraia as escápulas antes de iniciar a puxada", "Imagine que está puxando a barra para baixo, não você para cima"],
    "precautions": ["Evite se tiver 'ombro de nadador' ou tendinopatia do manguito aguda"],
    "benefits": ["Força global de costas e braços", "Estabilidade escapular", "Descompressão vertebral leve no pendurar"],
    "body_parts": ["Costas", "Membros Superiores"],
    "equipment": ["Barra fixa"],
    "muscles": ["Latíssimo do dorso", "Trapézio inferior", "Bíceps"]
  },
  {
    "id": "7fb207a7-8139-49e6-a718-2b8ad591c305",
    "name": "Avanço com Salto",
    "description": "Exercício dinâmico e explosivo (pliométrico) para aumentar a potência de membros inferiores.",
    "instructions": "1. Inicie na posição de avanço.\\n2. Salte de forma explosiva para cima, trocando a posição das pernas no ar.\\n3. Aterrisse suavemente voltando à posição de avanço com a outra perna à frente.\\n4. Use os braços para auxiliar o impulso.",
    "tips": ["Mantenha o core rígido para controle", "Priorize a qualidade da aterrissagem sobre a altura do salto", "Sempre aterrisse com a ponta dos pés seguida do calcanhar"],
    "precautions": ["Alto impacto: evite em fases agudas de lesão de joelho ou tornozelo", "Necessário bom equilíbrio prévio"],
    "benefits": ["Desenvolvimento de potência muscular", "Melhora do reflexo de estiramento-encurtamento", "Aumento do condicionamento cardiovascular"],
    "body_parts": ["Membros Inferiores", "Coxa"],
    "equipment": ["Peso corporal"],
    "muscles": ["Quadríceps femoral", "Glúteo máximo", "Panturrilhas"]
  },
  {
    "id": "e618ac87-5ae5-42c4-8b02-9867b6c82199",
    "name": "Alongamento Subescapular",
    "description": "Alongamento específico para o músculo subescapular, componente crucial do manguito rotador.",
    "instructions": "1. Posicione o braço flexionado a 90 graus lateralmente, com o antebraço apoiado em um batente de porta.\\n2. Gire o corpo suavemente para o lado oposto ao braço apoiado.\\n3. Sinta o alongamento na parte frontal profundidade do ombro.\\n4. Mantenha por 30 segundos.",
    "tips": ["Mantenha a escápula no lugar, não projete o ombro à frente", "Movimento deve ser sutil"],
    "precautions": ["Pare se sentir dor em 'pinçada' no ombro", "Não force a rotação externa excessiva"],
    "benefits": ["Melhora da rotação externa do ombro", "Auxilia no tratamento de síndrome do impacto", "Previne ombro protuso"],
    "body_parts": ["Membros Superiores", "Ombro"],
    "equipment": ["Batente de porta ou parede"],
    "muscles": ["Subescapular", "Peitoral maior"]
  },
  {
    "id": "814e398e-8302-4007-9bbb-bc35459db703",
    "name": "Alongamento de Tensor da Fáscia Lata",
    "description": "Focado na liberação da lateral do quadril, essencial para prevenir a síndrome da banda iliotibial.",
    "instructions": "1. Em pé, cruze a perna a ser alongada por trás da outra.\\n2. Incline o tronco para o lado oposto à perna de trás.\\n3. Empurre o quadril para fora.\\n4. Você deve sentir o alongamento na lateral do quadril e coxa.",
    "tips": ["Use uma parede para apoio se necessário", "Mantenha os pés bem firmes no chão"],
    "precautions": ["Cuidado se tiver instabilidade lateral de joelho"],
    "benefits": ["Redução de tension na banda iliotibial", "Melhora da mobilidade lateral do quadril"],
    "body_parts": ["Quadril", "Membros Inferiores"],
    "equipment": ["Parede (apoio)"],
    "muscles": ["Tensor da fáscia lata", "Glúteo médio"]
  },
  {
    "id": "f57ceaf7-b527-4b2c-b74f-f6a1411e2aa4",
    "name": "Isometria de Inversão de Tornozelo",
    "description": "Exercício de reabilitação essencial para fortalecer os estabilizadores mediais do tornozelo sem movimentar a articulação.",
    "instructions": "1. Sentado, encoste a lateral interna do pé contra um pé de mesa ou parede.\\n2. Empurre o pé para dentro (inversão) contra a superfície imóvel.\\n3. Mantenha a contração por 5-10 segundos.\\n4. O pé não deve se mover, apenas o músculo deve contrair.",
    "tips": ["Mantenha o joelho parado", "A força deve ser constante e controlada", "Foque no músculo tibial posterior"],
    "precautions": ["Inicie com pouca força em pós-operatórios imediatos"],
    "benefits": ["Fortalecimento protetor pós-entorse", "Estabilidade do arco plantar", "Seguro para fases iniciais de reabilitação"],
    "body_parts": ["Membros Inferiores", "Tornozelo"],
    "equipment": ["Parede ou objeto fixo"],
    "muscles": ["Tibial posterior"]
  }
];

const fs = require('fs');

const formatArray = (arr) => {
  return \"'\" + JSON.stringify(arr).replace(/'/g, \"''\") + \"'\";
};

let sql = '';
exercises.forEach(e => {
  sql += 'UPDATE exercises SET ' +
    \"description = $$\" + e.description + \"$$, \" +
    \"instructions = $$\" + e.instructions + \"$$, \" +
    \"tips = \" + formatArray(e.tips) + \"::jsonb, \" +
    \"precautions = \" + formatArray(e.precautions) + \"::jsonb, \" +
    \"benefits = \" + formatArray(e.benefits) + \"::jsonb, \" +
    \"body_parts = \" + formatArray(e.body_parts) + \"::jsonb, \" +
    \"equipment = \" + formatArray(e.equipment) + \"::jsonb, \" +
    \"muscles = \" + formatArray(e.muscles) + \"::jsonb \" +
    \"WHERE id = '\" + e.id + \"';\\n\";
});

fs.writeFileSync('tmp/batch_placeholders.sql', sql);
