import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
  {
    slug: 'alongamento-triceps-toalha',
    instructions: "### Guia Passo a Passo: Alongamento de Tríceps com Toalha\n\n1.  **Posicionamento**: Em pé, segure uma ponta de uma toalha pequena com a mão do braço que deseja alongar.\n2.  **Preparação**: Eleve esse braço e dobre o cotovelo, deixando a toalha cair pelas costas.\n3.  **Execução**: Com a outra mão (por baixo, na altura da lombar), segure a outra ponta da toalha.\n4.  **Alongamento**: Puxe suavemente a toalha com a mão de baixo, fazendo com que o braço de cima alongue o tríceps.\n5.  **Manutenção**: Segure por 30 segundos, sentindo a tensão confortável.",
    description: "Maneira assistida e controlada de alongar o tríceps e melhorar a rotação dos ombros.",
    tips: ["Tente manter a coluna alinhada, sem projetar a cabeça para frente.", "A tração deve ser constante e suave, nunca brusca.", "Pode servir também para alongar a rotação interna do braço de baixo simultaneamente."],
    precautions: ["Evite se houver lesões agudas no manguito rotador ou capsulite adesiva severa.", "Pare se sentir dores agudas ou choque no ombro."],
    benefits: ["Melhora da flexibilidade do tríceps e mobilidade complexa do ombro.", "Útil para ganhar amplitude necessária para atividades funcionais como vestir-se."]
  },
  {
    slug: 'mobilizacao-patelar',
    instructions: "### Guia Passo a Passo: Mobilização Patelar\n\n1.  **Posicionamento**: Sente-se com a perna estendida e o quadríceps totalmente relaxado. A patela (rótula) deve estar 'solta'.\n2.  **Execução**: Use os polegares e dedos indicadores para segurar as bordas da patela.\n3.  **Movimentos**: Empurre a patela suavemente em quatro direções: para cima (superior), para baixo (inferior), para dentro (medial) e para fora (lateral).\n4.  **Frequência**: Realize movimentos oscilatórios lentos em cada direção por cerca de 30 segundos.",
    description: "Técnica de terapia manual realizada pelo próprio paciente para manter ou ganhar mobilidade da articulação patelofemoral.",
    tips: ["O relaxamento do músculo da coxa (quadríceps) é fundamental; se ele estiver contraído, a patela não se moverá.", "O movimento deve ser suave e indolor.", "Pode ser feito antes de exercícios de fortalecimento para facilitar o deslizamento articular."],
    precautions: ["Contraindicado em casos de luxação recente da patela sem estabilização.", "Evite se houver fraturas patelares não consolidadas ou inflamação aguda severa."],
    benefits: ["Aumento da mobilidade patelofemoral.", "Redução da rigidez pós-cirúrgica ou pós-imobilização.", "Melhora da biomecânica da extensão do joelho."]
  },
  {
    slug: 'pronacao-e-supinacao-com-peso',
    instructions: "### Guia Passo a Passo: Pronação e Supinação com Peso\n\n1.  **Posicionamento**: Sentado, com o antebraço apoiado em uma mesa ou na coxa, segurando a base de um halter ou um bastão com carga em uma das extremidades.\n2.  **Execução**: Gire lentamente o antebraço, levando a palma da mão para cima (supinação) e depois para baixo (pronação).\n3.  **Alavanca**: Quanto mais longe da carga você segurar, maior será o desafio muscular.\n4.  **Controle**: Realize o movimento de forma lenta para evitar o uso do balanço.",
    description: "Fortalecimento específico para os músculos rotadores do antebraço, essencial para estabilidade do cotovelo e punho.",
    tips: ["Mantenha o cotovelo sempre em 90 graus e junto ao corpo.", "A força deve vir do antebraço, não do ombro.", "Mantenha o punho firme durante a rotação."],
    precautions: ["Cuidado em casos de epicondilite (lateral ou medial) ativa.", "Ajuste a carga ou a alavanca se sentir dor articular."],
    benefits: ["Fortalecimento dos músculos pronadores e supinadores.", "Melhora da estabilidade dinâmica do punho.", "Funcionalidade para atividades de vida diária (ex: abrir portas, usar chaves)."]
  },
  {
    slug: 'deslizamento-de-calcanhar',
    instructions: "### Guia Passo a Passo: Deslizamento de Calcanhar (Heel Slides)\n\n1.  **Posicionamento**: Deite-se de costas em uma superfície firme (cama ou tatame) com as pernas estendidas.\n2.  **Execução**: Deslize lentamente o calcanhar em direção aos glúteos, flexionando o joelho e o quadril o máximo que conseguir de forma confortável.\n3.  **Retorno**: Deslize o calcanhar de volta para a posição inicial de perna estendida.\n4.  **Apoio**: Use uma toalha sob o calcanhar ou use meias para facilitar o deslizamento em superfícies lisas.",
    description: "Exercício fundamental de mobilidade pós-operatória para recuperar a flexão do joelho de forma controlada.",
    tips: ["Mantenha o calcanhar sempre em contato com a superfície.", "Você pode usar as mãos ou uma faixa para auxiliar no final da flexão se permitido pelo fisioterapeuta.", "Evite que o joelho caia para os lados durante o deslizamento."],
    precautions: ["Respeite os limites de amplitude de movimento impostos pelo protocolo cirúrgico.", "Evite forçar contra uma dor aguda persistente."],
    benefits: ["Ganho de amplitude de movimento de flexão do joelho.", "Prevenção de aderências teciduais no pó-operatório.", "Melhora da circulação e redução de edema por bombeamento muscular."]
  },
  {
    slug: 'preensao-de-toalha-com-os-dedos',
    instructions: "### Guia Passo a Passo: Preensão de Toalha com os Dedos\n\n1.  **Posicionamento**: Sentado com os pés apoiados em uma toalha no chão.\n2.  **Execução**: Utilize os dedos dos pés para agarrar e amassar a toalha, tentando formar um 'bolo' de tecido sob o pé.\n3.  **Extensão**: Após amassar, tente usar os dedos para esticar a toalha novamente ou simplesmente relaxe e repita.\n4.  **Foco**: Concentre-se na ativação da musculatura intrínseca da sola do pé.",
    description: "Fortalecimento para a musculatura flexora dos dedos do pé e suporte do arco plantar.",
    tips: ["Não retire o calcanhar do solo.", "Tente movimentar cada dedo de forma coordenada.", "Pode ser feito em pé para aumentar a carga muscular (nível avançado)."],
    precautions: ["Evite se houver lesões agudas nos tendões flexores ou dor severa no antepé.", "Cuidado em pés diabéticos (verificar integridade da pele)."],
    benefits: ["Fortalecimento dos flexores dos dedos e lumbricais do pé.", "Melhora da estabilidade durante a fase de apoio da marcha.", "Auxílio no tratamento de fascite plantar."]
  },
  {
    slug: 'deadlift-levantamento-terra-com-halteres',
    instructions: "### Guia Passo a Passo: Levantamento Terra (Deadlift) com Halteres\n\n1.  **Posição Inicial**: Pés na largura do quadril, halteres no chão ao lado dos pés ou segurados à frente das coxas.\n2.  **Descida**: Flexione quadris e joelhos simultaneamente, mantendo a coluna perfeitamente neutra e o peito aberto, até que as mãos alcancem a altura das canelas.\n3.  **Tração**: Puxe o ar, ative o core e suba estendendo joelhos e quadris ao mesmo tempo, mantendo os pesos próximos ao corpo.\n4.  **Finalização**: No topo, fique ereto e expire. Não hiperextenda a coluna para trás.\n5.  **Descida**: Retorne ao solo com controle, mantendo o alinhamento corporal.",
    description: "Exercício composto global de força de cadeia posterior e core, focado em levantar carga do solo com segurança.",
    tips: ["A coluna nunca deve arredondar (manter as curvas naturais).", "Os calcanhares devem estar sempre firmes no chão.", "Pense em 'empurrar o chão' e não apenas em puxar o peso."],
    precautions: ["Fundamental dominar a técnica antes de aumentar a carga.", "Evite em crises agudas de dor lombar ou instabilidade vertebral severa."],
    benefits: ["Fortalecimento global massivo (glúteos, ísquios, eretores da espinha, core).", "Melhora da mecânica de levantamento de peso no cotidiano.", "Aumento da densidade óssea e força sistêmica."]
  },
  {
    slug: 'lunge-com-rotacao',
    instructions: "### Guia Passo a Passo: Lunge com Rotação (Avanço com Rotação de Tronco)\n\n1.  **Posicionamento**: Em pé, com os braços estendidos à frente ou segurando uma bola leve.\n2.  **Avanço**: Dê um passo largo para frente e desça para a posição de afundo.\n3.  **Rotação**: Mantendo a posição de afundo estável, gire o tronco lentamente para o lado da perna que está à frente.\n4.  **Retorno**: Volte o tronco para o centro e depois retorne à posição em pé.\n5.  **Alternância**: Repita com a outra perna.",
    description: "Combina o fortalecimento de pernas com a mobilidade torácica e desafio de estabilidade do core.",
    tips: ["Mantenha a pelve apontada para frente durante a rotação do tronco.", "O movimento de rotação deve ser controlado, sem movimentos bruscos.", "Mantenha o joelho da frente alinhado com o tornozelo."],
    precautions: ["Cuidado se houver dor lombar que piora com a torção.", "Certifique-se de ter equilíbrio suficiente antes de realizar com carga."],
    benefits: ["Melhora do equilíbrio dinâmico.", "Aumento da mobilidade torácica.", "Fortalecimento de membros inferiores e músculos oblíquos do abdômen."]
  },
  {
    slug: 'desvio-radial-de-punho',
    instructions: "### Guia Passo a Passo: Desvio Radial de Punho\n\n1.  **Posicionamento**: Antebraço apoiado em uma mesa com o punho para fora, mão em posição neutra (polegar para cima).\n2.  **Execução**: Eleve o polegar em direção ao teto (desvio radial), mantendo o antebraço encostado no apoio.\n3.  **Retorno**: Desça lentamente até a posição inicial.\n4.  **Carga**: Utilize um pequeno halter ou mesmo uma garrafa de água.",
    description: "Fortalecimento para os músculos estabilizadores do punho do lado do polegar.",
    tips: ["Mantenha o braço e o ombro relaxados.", "O movimento deve ser puro no punho, sem girar o antebraço.", "A descida controlada é essencial para o fortalecimento tendíneo."],
    precautions: ["Evite na fase aguda de De Quervain (tenossinovite do polegar).", "Pare se sentir dor aguda no processo estiloide do rádio."],
    benefits: ["Fortalecimento dos extensores radiais do carpo.", "Melhora da estabilidade do punho para atividades manuais.", "Reabilitação de lesões ligamentares do punho."]
  },
  {
    slug: 'squeeze-de-bola-espalmar',
    instructions: "### Guia Passo a Passo: Squeeze de Bola (Espalmar)\n\n1.  **Posicionamento**: Segure uma bola de borracha macia ou terapêutica na palma da mão.\n2.  **Execução**: Aperte a bola com todos os dedos e a palma da mão simultaneamente, aplicando força máxima confortável.\n3.  **Manutenção**: Sustente o aperto por 3 a 5 segundos.\n4.  **Relaxamento**: Solte lentamente a pressão e repita.",
    description: "Exercício simples e eficaz para melhorar a força de preensão manual e coordenação fina.",
    tips: ["Use uma bola com densidade adequada ao seu nível de força.", "Tente envolver todos os dedos no aperto.", "Pode ser feito em qualquer lugar para combater o estresse e melhorar a circulação."],
    precautions: ["Evite se houver inflamações agudas nos tendões flexores dos dedos.", "Cuidado em casos de artrite reumatoide em fase de crise."],
    benefits: ["Aumento da força de preensão manual.", "Melhora da circulação nas mãos.", "Manutenção da funcionalidade manual em idosos ou pós-trauma."]
  },
  {
    slug: 'push-up-plus',
    instructions: "### Guia Passo a Passo: Push-up Plus\n\n1.  **Posição Inicial**: Comece na posição de prancha alta (mãos no chão, braços estendidos), ou com os joelhos apoiados para facilitar.\n2.  **A Parte 'Plus'**: Sem dobrar os cotovelos, projete o peito para cima, afastando as escápulas uma da outra (protração escapular). Sinta as costas arredondarem levemente.\n3.  **Retorno**: Deixe as escápulas se aproximarem novamente, descendo o peito sem flexionar os braços.\n4.  **Ritmo**: Mantenha o movimento pequeno, focado exclusivamente nas escápulas.",
    description: "Exercício específico para o fortalecimento do músculo serrátil anterior, crucial para a estabilidade da escápula e saúde do ombro.",
    tips: ["Imagine que está 'empurrando o chão para longe' de você.", "Mantenha o resto do corpo imóvel; apenas as escápulas se movem.", "Pode ser feito contra a parede para iniciantes."],
    precautions: ["Evite se houver dor aguda na articulação acromioclavicular.", "Mantenha o pescoço neutro; não deixe a cabeça 'cair' durante o movimento."],
    benefits: ["Fortalecimento do serrátil anterior.", "Correção de escápula alada.", "Melhora da estabilidade articular do ombro."]
  },
  {
    slug: 'exercicio-de-parede-para-ombro',
    instructions: "### Guia Passo a Passo: Wall Slides (Deslizamento na Parede)\n\n1.  **Posicionamento**: Fique de pé, costas encostadas em uma parede, pés ligeiramente à frente.\n2.  **Apoio**: Encoste a cabeça, ombros, braços e o dorso das mãos na parede. Os braços começam em posição de 'W'.\n3.  **Execução**: Deslize as mãos e os braços para cima pela parede, transformando o 'W' em um 'Y'.\n4.  **Regra de Ouro**: Tente manter o contato constante dos braços e das mãos com a parede durante todo o trajeto.\n5.  **Retorno**: Desça os braços lentamente até a posição inicial.",
    description: "Excelente exercício para mobilidade torácica, ativação de trapézio inferior e estabilização de ombros.",
    tips: ["Não arqueie a lombar para compensar a falta de mobilidade nos ombros; mantenha a coluna em contato com a parede.", "Se os braços saírem da parede, suba apenas até onde conseguir manter o contato.", "Respire profundamente ao elevar os braços."],
    precautions: ["Evite se houver dor impeditiva por impacto de ombro severo.", "Não force o contato se causar dor articular aguda."],
    benefits: ["Melhora da postura (retificação da cifose torácica).", "Ativação de estabilizadores escapulares posteriores.", "Aumento da amplitude de movimento de ombro."]
  },
  {
    slug: 'extensao-de-dedos',
    instructions: "### Guia Passo a Passo: Extensão de Dedos com Elástico\n\n1.  **Posicionamento**: Coloque um elástico de borracha ao redor das pontas dos dedos e polegar reunidos.\n2.  **Execução**: Abra a mão, estendendo e separando os dedos contra a resistência do elástico.\n3.  **Controle**: Mantenha a abertura máxima por um segundo e retorne lentamente à posição inicial.\n4.  **Repetição**: Realize várias repetições até sentir a fadiga muscular no dorso da mão e antebraço.",
    description: "Fortalecimento para a musculatura extensora dos dedos e punho, muitas vezes negligenciada em relação aos flexores.",
    tips: ["Garanta que o polegar também esteja trabalhando no movimento.", "Use elásticos de diferentes tensões para progredir no exercício.", "Tente manter o punho em posição neutra."],
    precautions: ["Evite se houver epicondilite lateral em fase aguda severa.", "Cuidado com ferimentos ou cortes nos dedos."],
    benefits: ["Equilíbrio muscular entre flexores e extensores da mão.", "Fortalecimento da estabilidade do punho.", "Auxílio no tratamento de 'cotovelo de tenista'."]
  },
  {
    slug: 'alongamento-triceps-parede',
    instructions: "### Guia Passo a Passo: Alongamento de Tríceps na Parede\n\n1.  **Posicionamento**: Fique de frente para uma parede. Eleve o braço e apoie o cotovelo na parede, dobrando o braço para que a mão aponte para as costas.\n2.  **Execução**: Use seu peso corporal ou dê um pequeno passo para frente para aumentar o ângulo do braço, forçando o alongamento do tríceps.\n3.  **Manutenção**: Sustente a posição por 30 segundos.\n4.  **Variação**: Pode ser feito em uma quina de parede para maior conforto do ombro.",
    description: "Variação estável do alongamento de tríceps que utiliza a parede como ponto de fixação.",
    tips: ["Tente manter o peito voltado para frente.", "Não deixe a lombar arquear excessivamente.", "A pressão contra a parede deve ser firme mas confortável."],
    precautions: ["Cuidado se houver instabilidade anterior de ombro.", "Pare se sentir dor ou formigamento excessivo."],
    benefits: ["Alongamento profundo do tríceps braquial.", "Melhora da mobilidade de flexão do ombro.", "Excelente para realizar durante pausas no trabalho."]
  },
  {
    slug: 'barra-fixa-pronada',
    instructions: "### Guia Passo a Passo: Barra Fixa Pronada (Pull-Up)\n\n1.  **Posicionamento**: Segure na barra com as palmas voltadas para frente (pronadas), em uma largura ligeiramente superior à dos ombros.\n2.  **Suspensão**: Pendure-se totalmente com braços estendidos.\n3.  **Execução**: Puxe o corpo para cima, puxando as escápulas para baixo e levando os cotovelos em direção às costelas, até o queixo passar da barra.\n4.  **Descida**: Retorne com controle total até a extensão completa.",
    description: "Exercício fundamental de força de membros superiores e costas, focado nos grandes dorsais.",
    tips: ["Imagine que está tentando puxar a barra em direção ao peito, não apenas subir o queixo.", "Evite balançar as pernas.", "Mantenha o core rígido durante todo o movimento."],
    precautions: ["Indicado apenas para pacientes em fase avançada de reabilitação muscular.", "Cuidado em casos de lesões crônicas de manguito rotador."],
    benefits: ["Fortalecimento massivo de costas, bíceps e core.", "Melhora da postura escapular.", "Aumento da força funcional global."]
  },
  {
    slug: 'alongamento-subescapular',
    instructions: "### Guia Passo a Passo: Alongamento Subescapular (Canto de Parede)\n\n1.  **Posicionamento**: Fique em um canto de parede ou em um batente de porta.\n2.  **Preparação**: Apoie o antebraço e a mão na parede, com o braço em 90 graus de abdução e 90 graus de flexão de cotovelo.\n3.  **Execução**: Dê um pequeno passo para frente com uma das pernas e gire o tronco ligeiramente para o lado oposto ao braço apoiado.\n4.  **Sensação**: Você deve sentir o alongamento na parte frontal do ombro e axila.\n5.  **Manutenção**: Segure por 30 segundos e repita do outro lado.",
    description: "Alongamento focado na musculatura de rotação interna do ombro (subescapular) e peitorais.",
    tips: ["Mantenha o ombro baixo, longe da orelha.", "Não faça movimentos bruscos; o alongamento deve ser contínuo.", "A respiração profunda ajuda a relaxar a musculatura torácica."],
    precautions: ["Contraindicado para instabilidade anterior severa do ombro.", "Cuidado se houver síndrome do impacto do ombro em fase aguda."],
    benefits: ["Melhora da rotação externa do ombro.", "Correção da postura de ombros 'fechados'.", "Redução de tensões na face anterior da articulação gleno-umeral."]
  },
  {
    slug: 'alongamento-de-isquiotibiais',
    instructions: "### Guia Passo a Passo: Alongamento de Isquiotibiais (Sentado)\n\n1.  **Posicionamento**: Sente-se no chão com uma perna estendida e a outra flexionada (pé tocando a parte interna da coxa oposta).\n2.  **Execução**: Incline o tronco para frente a partir do quadril, mantendo a coluna o mais reta possível, em direção ao pé da perna estendida.\n3.  **Alcance**: Vá até sentir um alongamento moderado na parte de trás da coxa. Não precisa necessariamente tocar o pé.\n4.  **Manutenção**: Sustente por 30 segundos, relaxando a cada expiração.",
    description: "Alongamento clássico para a cadeia posterior da coxa, fundamental para a saúde da lombar e mobilidade de quadril.",
    tips: ["Mantenha o pé da perna estendida apontado para cima (flexão dorsal).", "Não arredonde exageradamente as costas; o movimento deve vir do quadril.", "Se tiver dificuldade, use uma toalha ou faixa ao redor do pé para ajudar a puxar o tronco."],
    precautions: ["Evite se houver dor ciática aguda ou hérnia de disco sintomática.", "Dobre levemente o joelho se sentir uma tensão excessiva atrás do joelho em vez do músculo."],
    benefits: ["Melhora da flexibilidade dos isquiotibiais.", "Redução da sobrecarga na coluna lombar.", "Aumento da amplitude de movimento de quadril."]
  },
  {
    slug: 'alongamento-de-panturrilha-na-parede',
    instructions: "### Guia Passo a Passo: Alongamento de Panturrilha (Gastrocnêmio)\n\n1.  **Posicionamento**: Em pé de frente para uma parede, apoie as mãos nela na altura dos ombros.\n2.  **Preparação**: Dê um passo para trás com a perna que deseja alongar, mantendo-a estendida e o calcanhar firme no chão.\n3.  **Execução**: Incline o corpo para frente, flexionando o joelho da frente até sentir o alongamento na batata da perna de trás.\n4.  **Manutenção**: Segure por 30 a 45 segundos, respirando normalmente.",
    description: "Alongamento específico para o músculo gastrocnêmio, focado na flexibilidade do tornozelo.",
    tips: ["O calcanhar de trás nunca deve sair do chão.", "Mantenha o pé de trás apontado diretamente para a parede, sem girar para fora.", "Mantenha o tronco e o quadril alinhados."],
    precautions: ["Cuidado em casos de lesões de Aquiles parciais ou recentes.", "Evite se houver dor aguda no arco plantar durante o apoio."],
    benefits: ["Prevenção de cãibras e tensões na panturrilha.", "Melhora da dorsiflexão do tornozelo.", "Auxílio no tratamento de fascite plantar e tendinopatias de Aquiles."]
  },
  {
    slug: 'alongamento-de-soleo-na-parede',
    instructions: "### Guia Passo a Passo: Alongamento de Sóleo na Parede\n\n1.  **Posicionamento**: Mesma posição inicial do alongamento de panturrilha (em pé, de frente para a parede, perna de trás afastada).\n2.  **Execução**: Desta vez, flexione levemente o joelho da perna de trás, mantendo o calcanhar encostado no chão.\n3.  **Foco**: Ao dobrar o joelho, a tensão deve descer para a parte inferior da panturrilha, próximo ao calcanhar.\n4.  **Manutenção**: Sustente por 30 segundos.",
    description: "Variação do alongamento de panturrilha que isola o músculo sóleo, localizado sob os gastrocnêmios.",
    tips: ["A flexão do joelho de trás é sutil, apenas o suficiente para mudar o foco do alongamento.", "Mantenha o peso distribuído uniformemente.", "A descida do quadril ajuda a intensificar o alongamento no local correto."],
    precautions: ["Evite se houver bursite retrocalcânea ativa ou dor aguda no calcanhar."],
    benefits: ["Alongamento do músculo sóleo.", "Melhora da mobilidade profunda do tornozelo.", "Essencial para corredores e pacientes com restrição de dorsiflexão."]
  },
  {
    slug: 'elevacao-pelvica',
    instructions: "### Guia Passo a Passo: Elevação Pélvica (Ponte)\n\n1.  **Posição Inicial**: Deitado de costas, joelhos flexionados e pés apoiados no chão na largura dos quadris.\n2.  **Execução**: Contraia os glúteos e abdômen para elevar o quadril do chão até que o corpo forme uma linha reta dos ombros aos joelhos.\n3.  **Pico**: Mantenha a contração no topo por 2 segundos.\n4.  **Retorno**: Desça o quadril de forma controlada até encostar levemente no solo e repita.",
    description: "Exercício fundamental para fortalecimento de glúteos e estabilidade do core, com baixo impacto.",
    tips: ["Pressione os calcanhares contra o chão para ativar mais os glúteos.", "Não deixe a lombar arquear excessivamente no topo.", "Mantenha os joelhos alinhados, sem deixá-los cair para dentro."],
    precautions: ["Evite se houver dor lombar aguda ou instabilidade articular de quadril.", "Cuidado para não usar excessivamente os isquiotibiais em vez dos glúteos."],
    benefits: ["Fortalecimento de glúteo máximo e estabilizadores lombares.", "Melhora da estabilidade pélvica.", "Auxílio na prevenção de dores nas costas e joelhos."]
  },
  {
    slug: 'flexao-braco',
    instructions: "### Guia Passo a Passo: Flexão de Braço (Push-up)\n\n1.  **Posição Inicial**: Mãos no chão, ligeiramente mais afastadas que a largura dos ombros, pontas dos pés apoiadas e corpo em linha reta.\n2.  **Descida**: Flexione os cotovelos para descer o peito em direção ao solo, mantendo o core e os glúteos ativados.\n3.  **Execução**: Os cotovelos devem formar um ângulo de cerca de 45 graus com o tronco.\n4.  **Subida**: Empurre o chão com força para retornar à posição inicial com braços estendidos.",
    description: "Exercício clássico de calistenia para fortalecimento de peitoral, tríceps e deltoide anterior.",
    tips: ["Mantenha o corpo como uma tábua rígida; não deixe o quadril cair.", "Olhe para o chão logo à frente para manter o pescoço neutro.", "Pode realizar com os joelhos no chão para reduzir a carga inicial."],
    precautions: ["Evite se houver lesões agudas no manguito rotador ou dor severa nos punhos.", "Cuidado com a hiperextensão lombar."],
    benefits: ["Fortalecimento massivo de membros superiores e core.", "Melhora da força de empurrar funcional.", "Aumento da estabilidade articular do ombro."]
  }
];

async function updateExercises() {
  const sql = neon(DATABASE_URL);
  try {
    console.log(`🚀 Iniciando enriquecimento de ${enrichmentData.length} exercícios (Batch 3)...`);

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

    console.log('✨ Batch 3 concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante o enriquecimento:', err);
  }
}

updateExercises();
