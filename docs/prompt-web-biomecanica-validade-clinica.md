# Prompt para o Claude Code — versão WEB do FisioFlow

> Cole o conteúdo abaixo (a partir da linha `---`) numa sessão do Claude Code
> aberta na raiz do repositório. Ele descreve mudanças na **web** (`src/`) para
> alinhar com o que foi descoberto na pesquisa de validade clínica e no
> levantamento de concorrentes durante o trabalho no app do profissional.

---

Trabalhe no repositório FisioFlow, na **versão web** (`src/`, React 19 + Vite +
Tailwind v4 + Shadcn). O app mobile (`apps/professional-app`) e a API
(`apps/api`) já receberam parte destas mudanças; o objetivo aqui é a paridade
na web, para o mesmo número não ser apresentado de duas formas diferentes.

Leia antes de começar:
- `packages/core/src/biomechanics/` — o núcleo de cinemática. É compartilhado e
  já é dependência da web. **Toda a matemática deve sair daqui**, nunca ser
  reimplementada no front.
- `apps/api/src/routes/biomechanics.ts` — os portões clínicos já existentes.
- `apps/api/migrations/0165_biomechanics_pose_provenance.sql` — a coluna
  `provenance` e as travas de banco.

## Contexto: o que a literatura obriga a mudar

Uma revisão da evidência (PubMed, agosto/2026) encontrou problemas de validade
no que estava sendo exibido. Os pontos abaixo NÃO são preferência de UX — são
correções de erro factual em informação clínica.

**1. FPPA não é "valgo de joelho em graus".**
Lopes TJA et al., *J Orthop Sports Phys Ther* 2018;48(10):812-22
(doi:10.2519/jospt.2018.8006) — meta-análise: no agachamento unipodal a
correlação entre FPPA 2D e o ângulo frontal 3D é **r=0,127 (p=0,094)**, ou seja
nula. O FPPA reflete majoritariamente adução de quadril e rotação externa de
tíbia. Willson & Davis, *JOSPT* 2008;38(10):606-15
(doi:10.2519/jospt.2008.2706) são explícitos: *"não deve ser usado para
quantificar rotações 3D"*.

**Ação:** onde a UI escrever "Valgo dinâmico", trocar por
**"FPPA (ângulo de projeção no plano frontal)"** com tooltip explicando que é
um marcador de padrão de movimento, não medida de ângulo articular.

**2. Valor absoluto de FPPA vindo de MediaPipe não tem validade.**
Asaeda M et al., *Heliyon* 2024;10(17):e36338
(doi:10.1016/j.heliyon.2024.e36338): erro de **18,83–19,68°** vs Vicon. Apenas
a **variação a partir do contato inicial** teve validade concorrente.

**Ação:** exibir FPPA como *variação* (Δ em relação ao início do movimento).
Se só houver o valor absoluto, marcá-lo visualmente como estimativa e não
usá-lo em comparação entre sessões.

**3. Mudança abaixo da diferença mínima detectável é ruído.**
- FPPA: **MDC 7,5–9,2°** — Munro A et al., *J Sport Rehabil* 2012;21(1):7-11
  (doi:10.1123/jsr.21.1.7); Mansfield CJ et al., *Knee* 2022;36:87-96
  (doi:10.1016/j.knee.2022.04.010).
- Índice de simetria / LSI: **MDC 7–13 pontos percentuais** — Reid A et al.,
  *Phys Ther* 2007;87(3):337-49 (doi:10.2522/ptj.20060143).
- Velocidade de marcha: SEM 0,07 m/s; comprimento de passo: SEM 0,06 m —
  Varcin F & Boocock MG, *Artif Intell Med* 2025;173:103332
  (doi:10.1016/j.artmed.2025.103332).

**Ação (a mais importante deste prompt):** toda tela de comparação antes/depois
deve comparar o delta contra o MDC da métrica. Abaixo do MDC, renderizar
**"sem mudança detectável"** em tom neutro — nunca seta verde de melhora nem
seta vermelha de piora. Hoje uma variação de 3° apareceria como progresso, e é
ruído de medição.

**4. Simetria basal não existe.**
Lambert C et al., *Int J Sports Med* 2020;41(11):729-35
(doi:10.1055/a-1171-2548): **93–98,3% dos atletas saudáveis não têm simetria**
nos hop tests; até um quarto não atinge LSI >90. Gokeler A et al., *Orthop
Traumatol Surg Res* 2017;103(6):947-51 (doi:10.1016/j.otsr.2017.02.015): o LSI
**mascara déficits bilaterais**.

**Ação:** não pintar assimetria como anormalidade por si só. Onde houver
"Simetria E/D", acompanhar de nota de que assimetria é comum em população
saudável.

**5. Há medidas que não podem ser reportadas a partir de vídeo 2D.**
Plano transverso (qualquer rotação), cinemática pélvica, momentos articulares,
forças de reação do solo, e ângulos de cotovelo/punho (MAE 27,7° — Auer S et
al., *Technol Health Care* 2024;32(5):3433-42, doi:10.3233/THC-240202).

**Ação:** se a UI oferecer essas métricas em algum lugar, remover ou marcar
como indisponível. `packages/core/src/biomechanics/pipeline.ts` já rejeita
métrica fora do plano compatível — a web deve **exibir a rejeição** ao usuário
("não mensurável neste plano"), com o motivo, em vez de mostrar campo vazio.

## Tarefas concretas na web

1. **Encontre onde a web exibe métricas biomecânicas.** Procure por
   `dynamic_valgus`, `symmetry`, `knee_rom`, `trunk_inclination` em `src/`.
   Inclui comparação antes/depois e qualquer geração de relatório.

2. **Crie `src/lib/biomechanics/clinicalThresholds.ts`** com os MDC/SEM da
   tabela acima, cada constante comentada com a citação (autor, ano, periódico,
   DOI). Este arquivo é a fonte única desses números na web.

3. **Crie um helper `interpretDelta(metricKey, delta)`** que devolva
   `"melhora" | "piora" | "sem_mudanca_detectavel"` comparando com o MDC. Use-o
   em TODA renderização de variação. Escreva teste unitário com os valores de
   fronteira (ex.: FPPA 7,4° → sem mudança; 9,3° → mudança).

4. **Exiba a procedência de cada métrica.** A coluna
   `biomechanics_metrics.provenance` já existe (migration 0165) e vale
   `device_pose | container_pose | manual | patient_reported | derived |
   synthetic_demo`. Renderize um chip por métrica ("no dispositivo" / "em
   nuvem" / "medição manual"). Um fisioterapeuta comparando captura de iPhone
   com reprocessamento em nuvem precisa saber que vieram de estimadores
   diferentes.

5. **Rodapé obrigatório em qualquer laudo/relatório biomecânico gerado na web:**
   > Métricas obtidas por estimativa de pose humana em vídeo 2D de câmera
   > única. Não substitui análise cinemática tridimensional laboratorial. O
   > FPPA é um marcador de padrão de movimento e não corresponde ao ângulo
   > frontal do joelho medido em 3D. Valores validados por <profissional>,
   > CREFITO <n>, em <data>.

6. **Exiba o SEM junto do valor** onde houver espaço (ex.: "FPPA 14,2° ± 3,0°").
   O usuário precisa ver a incerteza, não só o número.

7. **NÃO crie score sintético** tipo "idade do movimento" ou nota 0–100. A
   pesquisa de concorrentes mostrou que o Yogger faz isso; num laudo assinado no
   Brasil, isso é passivo sem lastro. Número, unidade, método e faixa de
   referência citada.

## Requisitos de captura a documentar na web

Se a web tiver tela de orientação/instruções para o profissional:
- Câmera a **≤2,5 m**, preferencialmente 2 m (acurácia degrada até 3,5 m —
  Barzegar Khanghah A et al., *Biomed Eng Online* 2024;23:11,
  doi:10.1186/s12938-024-01203-5).
- Corpo inteiro no quadro, sujeito **centralizado** (a detecção é melhor no
  centro — Mundt M et al., *Sensors* 2022;23(1):78, doi:10.3390/s23010078).
- Quadril/joelho: vista em **diagonal frontal**. Tornozelo: vista **lateral**
  (Yang J & Park K, *Bioengineering* 2024;11(2):141,
  doi:10.3390/bioengineering11020141).
- **3 tentativas** para agachamento/step-down (Couto AGB et al., *Sensors*
  2023;23(5):2526, doi:10.3390/s23052526).

## Fluxo (levantamento de concorrentes)

Yogger, Sportsbox AI, Uplift Capture e MyJump Lab exigem a identidade do
paciente **antes** da captura. O protocolo carrega o plano de câmera — a Exer
nomeia os testes como "Sit to Stand ROM (Side Facing)". A Uplift descarta
automaticamente capturas que falham no check de keypoints, antes de virarem
relatório.

Se a web tiver criação de protocolos biomecânicos, o **plano de câmera deve ser
atributo do protocolo**, não campo separado escolhido na hora.

## Restrições

- PT-BR na interface, sem emoji, ícones lucide.
- Sem glassmorphism: superfícies sólidas, cards chapados, raio 16px.
- TypeScript strict. Não reimplemente cinemática no front — importe de
  `@fisioflow/core`.
- Rode `pnpm test` e `pnpm type-check` antes de considerar pronto.
- Não invente número nem DOI. Se precisar de um limiar que não está aqui,
  diga que não há evidência em vez de arbitrar em silêncio.
