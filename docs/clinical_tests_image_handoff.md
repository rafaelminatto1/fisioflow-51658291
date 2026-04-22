# Handoff: Geração de Ilustrações de Testes Clínicos (FisioFlow)

Este documento contém os prompts e o status para a geração das ilustrações dos testes clínicos pendentes no catálogo.

## Guia de Estilo (Consistência Visual)
Para manter o padrão das ilustrações `.avif` existentes (ex: Lachman, FADIR), utilize o seguinte prompt base:

> **Prompt Base:** "High-quality medical illustration of the [NOME DO TESTE] clinical test. Clean minimalist professional style, realistic human anatomy, clinical lighting. Focus on the specific maneuver and the joint being tested. [ADICIONAL DE MANOBRA]. White background, soft shadows, 8k resolution, suitable for a premium physiotherapy application."

---

## Lista de Testes Pendentes (Prompts Detalhados)

| Teste | Nome do Arquivo Sugerido | Prompt Específico |
| :--- | :--- | :--- |
| **Arco Doloroso (Ombro)** | `painful-arc-test.avif` | "Human figure in standing position performing shoulder abduction. Highlight the 60°-120° range with a soft red indicator and a curved motion arrow." |
| **Mulder's Click (Pé)** | `mulder-click.avif` | "Close-up of a human foot. Examiner hands compressing the metatarsal heads laterally. A subtle 'click' starburst icon between the 3rd and 4th metatarsals." |
| **ULTT 1 (Nervo Mediano)** | `ultt1-median.avif` | "Patient in supine, arm abducted to 90°, elbow extended, wrist and fingers extended. A glowing yellow line tracking the median nerve from neck to hand." |
| **Epicondilite Medial** | `golfers-elbow.avif` | "Elbow and forearm in supination. Wrist being passively extended to stretch the medial flexors. Highlight the medial epicondyle area (inner elbow)." |
| **Teste de Adson (TOS)** | `adson-test.avif` | "Sitting patient, head rotated towards an abducted and extended arm. Pulse indicator on the radial artery at the wrist and compression at the neck." |
| **Teste de Roos (TOS)** | `roos-test.avif` | "Patient with both arms in 'surrender' position (90° abduction/90° elbow flexion), opening/closing hands. Indicators for fatigue and neural tension in the arms." |
| **Teste de Yergason** | `yergason-test.avif` | "Elbow flexed at 90°, forearm pronated. Patient resisting supination and external rotation. Highlight the bicipital groove of the shoulder." |
| **Ativação do VMO** | `vmo-activation.avif` | "Close-up of a knee in extension. Highlight the Vasto Medial Oblíquo (VMO) muscle fiber direction and contraction on the inner thigh." |
| **Sinal de Ludington** | `ludington-sign.avif` | "Patient with both hands on top of head, contracting biceps. Highlight the gap or deformity in the long head of the biceps tendon at the shoulder." |
| **Teste de Grind (Polegar)** | `thumb-grind.avif` | "Detailed hand illustration. Examiner applying axial load and rotating the base of the patient's thumb (CMC joint). Highlight the carpometacarpal joint." |
| **Teste de Patte** | `patte-test.avif` | "Shoulder in 90° abduction and 90° elbow flexion. Patient performing external rotation against resistance. Highlight the infraspinatus muscle area." |
| **Sinal de Homan (TVP)** | `homan-sign.avif` | "Leg with knee extended. Examiner performing abrupt passive dorsiflexion of the ankle. Highlight the calf muscle area for pain indication." |
| **Escala de Berg** | `berg-balance.avif` | "Infographic-style illustration of a senior performing a tandem stand balance task. Safety indicators and balance reach pointers included." |
| **Índice de Tinetti** | `tinetti-index.avif` | "Side view of a person walking and getting up from a chair. Motion paths and stability markers to indicate gait and balance assessment." |
| **SPPB (Funcionalidade)** | `sppb-test.avif` | "Triptych illustration showing: 1. Balance stand, 2. 4-meter walk, 3. 5x sit-to-stand task. Clean educational icons." |
| **Escala Oxford (Força)** | `oxford-scale.avif` | "Anatomical arm performing a bicep curl against a weight indicator (Scale 0 to 5). Visual representation of resistance and muscle recruitment." |

## Próximos Passos
1. Gerar as imagens acima no Gemini CLI.
2. Salvar em `public/clinical-tests/illustrations/` com extensão `.avif`.
3. O código já está preparado para mapear estes nomes de arquivos automaticamente conforme o padrão estabelecido.
