# Spec Técnica: Relatórios Inteligentes IA Studio (v1.0)

## 1. Visão Geral

Sistema de geração de relatórios clínicos PDF de alto padrão ("Premium"), que consolida dados de voz (Scribe), visão computacional (ADM/Gait) e predição de alta em um documento dual: técnico para médicos e humanizado para pacientes.

## 2. Estrutura do Relatório Dual

- **Capa & Identidade:** Branding da clínica, logo e dados do profissional.
- **Seção Técnica (Médico):**
  - Síntese clínica refinada por IA (Llama 3.1).
  - Quadros comparativos de ADM e Marcha (Eixo 2).
  - Embasamento científico automático via integração PubMed/Wiki.
- **Seção Humanizada (Paciente):**
  - Mensagem de incentivo gerada por IA baseada no progresso real.
  - Barra de "Aura Score" (Progresso para Alta).
  - Destaques de conquistas (ex: "Sua dor reduziu 40%").

## 3. Arquitetura Técnica

- **Motor de PDF:** `@react-pdf/renderer` para geração dinâmica no lado do cliente (Edge-friendly).
- **Geração de Texto:**
  - **Input:** Evoluções SOAP recentes + Medições de ADM + CID-10.
  - **IA:** Cloudflare Workers AI (Llama 3.1 70B) com prompt assistido por tópicos.
- **Assets Visuais:** Capturas de tela (stills) do esqueleto biomecânico e gráficos de tendência.

## 4. Segurança & LGPD

- Os relatórios gerados não são armazenados no Worker; são servidos como stream e persistidos opcionalmente no R2 Bucket da organização com criptografia.
- Nota de rodapé obrigatória sobre validação por IA.

## 5. Casos de Teste

- [ ] Geração de PDF com 10+ evoluções.
- [ ] Inclusão correta de imagem do GaitStudio (Overlay de Vetores).
- [ ] Refino de texto em menos de 5 segundos.
