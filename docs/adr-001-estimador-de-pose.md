# ADR-001 — Qual estimador de pose sustenta o número do laudo

**Data:** 06/08/2026
**Estado:** aceito
**Contexto:** módulo de biomecânica do app do profissional

## Problema

O plugin de pose que estávamos usando no aparelho
(`@scottjgilroy/react-native-vision-camera-v4-pose-detection`) acumulou quatro
defeitos em quatro tentativas de build:

1. Tipos publicados errados (`leftElbowX` em vez de `leftShoulderPosition`).
2. Podspec com nome da versão anterior — autolinking não encontrava.
3. Dependências de pods de RN 0.72 (`RCT-Folly`, `React-Codegen`).
4. No Objective-C, o ombro **direito** lia a coordenada do **esquerdo**.

O quarto é o grave: enviesa `trunkInclination`, que usa o ponto médio dos dois
ombros. Um pacote sem manutenção estava carregando o dado mais sensível do
produto.

## O que a investigação mostrou

### Panorama de pacotes (npm, ago/2026)

| Pacote | Última publicação | Situação |
|---|---|---|
| `@scottjgilroy/...-v4-pose-detection` | jul/2024 | Morto. Viveu 2 dias; 133 downloads/semana; o repositório apontado é de outra pessoa |
| `vision-camera-pose-landmarks-plugin` | nov/2025 | MediaPipe Pose Landmarker, 33 pts com visibility. Repo chamado `pose-detection-poc`, autor único, 15 downloads/semana |
| `react-native-mediapipe` | dez/2024 | Parado há ~20 meses |
| `react-native-executorch` | ago/2026, nightlies | Muito mantido, mas outra arquitetura (não é frame processor) e outros keypoints |
| `@infinitered/react-native-mlkit-*` | nov/2025 | Não tem pacote de pose |

Módulo próprio envolvendo MLKit: 3–5 dias para paridade, mais custo permanente
de manter binding nativo nas duas plataformas. O módulo local que já existe
(`modules/expo-vision-pose-detector`) não ajuda tanto quanto parece — usa Apple
Vision (19 pontos, não 33), só aceita imagem por URL, e não tem lado Android.

**Conclusão: não existe opção madura.**

### Evidência científica

Segundo o PubMed, Mundt M, Born Z, Goldacre M, Alderson J. *Sensors*
2022;23(1):78 ([doi:10.3390/s23010078](https://doi.org/10.3390/s23010078))
testaram AlphaPose, BlazePose e OpenPose **nos mesmos vídeos**: apenas
AlphaPose e OpenPose são intercambiáveis. O BlazePose tem taxa de detecção
distintamente inferior e **não** é permutável com os outros.

Não há estudo comparando MLKit Pose (aparelho) com MediaPipe (container),
ainda que ambos sejam linhagem BlazePose. Em contexto clínico, pergunta sem
resposta significa *não presuma que concordam*.

Asaeda M et al. *Heliyon* 2024;10(17):e36338
([doi:10.1016/j.heliyon.2024.e36338](https://doi.org/10.1016/j.heliyon.2024.e36338)):
FPPA absoluto com MediaPipe tem erro de 18,8–19,7° contra Vicon. Só a variação
a partir do contato inicial se sustenta.

O risco concreto: o valor clínico principal do módulo é a **comparação
longitudinal** entre sessões do mesmo paciente. Se a sessão 1 foi processada no
aparelho e a sessão 12 na nuvem, parte da diferença é troca de estimador — e o
laudo chamaria isso de progresso.

## Decisão

**O container é a fonte única dos números gravados. A pose no aparelho é
resultado provisório e feedback de enquadramento — nunca o que vai no laudo.**

Consequências práticas:

1. Toda captura dispara o container após o upload do vídeo. As métricas
   convergem para `provenance = 'container_pose'`.
2. As métricas de `device_pose` continuam existindo: aparecem na hora, marcadas
   como provisórias, e são **superseded** quando o container termina. A
   maquinaria de supersessão append-only da migration 0165 já faz isso.
3. `POST /:id/pdf` e `POST /:id/sign` só operam sobre métricas vivas. Como as
   de container superseded as de device, o laudo sai com um estimador só.
4. A tela de comparação avisa quando duas avaliações têm `pose_provenance`
   diferente (implementado).
5. O plugin no aparelho fica como conveniência de UI. Se quebrar, degrada para
   o caminho de nuvem, que já existe e é o padrão.

### Por que não as alternativas

**Módulo próprio (3–5 dias + manutenção):** resolveria os 4 patches, mas não
resolveria o problema real — continuaríamos com dois estimadores diferentes
entre aparelho e nuvem, e o risco longitudinal permaneceria. Custo alto para
não resolver o que importa.

**Migrar para `vision-camera-pose-landmarks-plugin`:** é MediaPipe, mesma
família do container, o que alinharia os dois caminhos. É a melhor opção *se*
um dia precisarmos de métricas confiáveis no aparelho. Hoje não precisamos, e
adotar um PoC de autor único com 15 downloads/semana como dependência crítica
seria trocar um risco conhecido por outro.

**`react-native-executorch`:** o mais mantido de longe, mas troca a
arquitetura e os keypoints. Reavaliar se o caminho on-device virar requisito.

**Ficar como está (device_pose como fonte de verdade):** inaceitável. O
estimador é um pacote morto, com um bug de coordenada já comprovado, e sem
garantia de concordar com o caminho de nuvem.

## O que revisita esta decisão

- Se o container se mostrar lento demais para o fluxo de consultório (meta:
  resultado em menos de 2 min), o on-device volta à mesa — e aí a migração para
  `vision-camera-pose-landmarks-plugin` (MediaPipe, mesma família) é o caminho,
  não um módulo próprio.
- Se surgir estudo comparando MLKit e MediaPipe e mostrando concordância dentro
  do MDC, o risco de misturar cai e o on-device pode voltar a gravar métrica.
- Se aparecer estimador com licença comercial e acurácia superior ao MediaPipe,
  a troca é barata: o container só precisa emitir o mesmo `ff-pose-33-v1`.

## Pendências desta decisão

- [x] **Construir a imagem Docker.** Feito e testada de ponta a ponta em
      06/08/2026: a imagem sobe, `/health` responde `mediapipe-pose 0.10.21`,
      e o fluxo completo funciona — baixa o vídeo, extrai 90 frames a 30 fps,
      emite `ff-pose-33-v1` válido, faz o PUT e chama de volta com sha256.
      Contra um vídeo sem pessoa (barra de cores), reportou
      `usableFrames: 0` em vez de alucinar uma pose, e o nosso próprio
      decodificador leu o bundle e produziu **zero métricas** com veredito
      `unusable`. O caminho honesto funciona.
- [ ] **Sanear a cadeia de migrations de DO.** Investigado: manter apenas a
      última tag aplicada (`v15`) mais a nova (`v16`) faz o dry-run de produção
      passar com os containers declarados — confirmado por bisseção. A doc da
      Cloudflare diz que tags são identificadores únicos usados para determinar
      o que já foi aplicado, o que sustenta essa leitura, mas o dry-run não
      consulta o estado do servidor. **Provar no staging (`fisioflow-api-staging`,
      worker separado) antes de tocar em produção.**
      Existe também o caminho novo `exports` (jul/2026), que elimina a cadeia
      legada de vez — mas é porta de mão única ("uma vez com exports, todos os
      deploys seguintes devem usar exports") e rollback não atravessa mudança
      de ciclo de vida. Não atravessar sem decisão explícita.
- [ ] Disparar o container automaticamente após `landmarks/complete` e após
      `media/complete` sem landmarks. Depende do item acima.
- [ ] Marcar métricas `device_pose` como provisórias na UI da análise.
