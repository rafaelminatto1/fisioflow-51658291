# Handoff: Geração de Imagens de Exercícios (FisioFlow)

Este documento serve para contextualizar o próximo agente/conta sobre o progresso da geração de ilustrações para a biblioteca de exercícios.

## Contexto
O objetivo é preencher as lacunas de ilustrações na tabela `exercises` do banco de dados Neon. Identificamos que muitos exercícios apontavam para caminhos no diretório `/exercises/illustrations/` que não existiam fisicamente.

## Status Atual
- **Total de imagens inicialmente faltantes:** 51
- **Imagens recuperadas/geradas:** 27 (15 recuperadas + 12 geradas agora)
- **Imagens ainda pendentes de geração:** 30
- **Problema de Infra:** Thumbnails no R2 (`r2.dev`) estão retornando erro 500 (precisa de investigação separada).

## Guia de Estilo (Consistência Visual)
Para manter o padrão das imagens existentes, use o seguinte prompt base:

> "Premium 3D medical illustration of a professional athletic character performing the [NOME DO EXERCÍCIO EM INGLÊS] exercise. Clinical studio lighting, white background, realistic anatomy, high-fidelity textures. The style is clean, modern, and educational, suitable for a physiotherapy application. Soft shadows, 8k resolution, cinematic render."

## Lista de Exercícios Pendentes (Batch Prioritário)
1. World's Greatest Stretch (`worlds-greatest-stretch.avif`)
2. Stir the Pot (`stir-the-pot.avif`)
3. Abdominal Reverso (`abdominal-reverso.avif`)
4. Giro Russo (`giro-russo.avif`)
5. Extensão Lombar (na bola) (`extensao-lombar-bola.avif`)
6. Postura da Criança (`postura-crianca.avif`)
7. Retração Cervical (`retracao-cervical.avif`)
8. Isométrico Cervical (`isometrico-cervical.avif`)
9. Flexão de Williams (`flexao-williams.avif`)
10. Turkish Get-Up (`turkish-get-up.avif`)

## Instruções para o Próximo Agente
1. Leia o banco de dados (tabela `exercises`) para confirmar os nomes de arquivo esperados em `image_url`.
2. Gere as imagens usando o prompt base acima.
3. Salve as imagens (preferencialmente em `.avif` ou `.png`) no diretório: `apps/web/public/exercises/illustrations/`.
4. Certifique-se de que o nome do arquivo corresponda exatamente ao que está no banco de dados para evitar 404s.
