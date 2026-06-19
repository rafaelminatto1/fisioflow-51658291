# Plano para correção de imagens faltantes nos exercícios

## Resumo

Este plano descreve o processo realizado para identificar exercícios com thumbnail ausente e proceder à correção.

## Etapa 1: Levantamento de dados

Consulta SQL para obter lista de exercícios com thumbnail ausente:

```sql
SELECT id, name, slug, image_url
FROM exercises
WHERE is_active = true
  AND (thumbnail_url IS NULL OR btrim(thumbnail_url) = '' OR thumbnail_url = '---')
ORDER BY name;
```

Resultado: 62 exercícios.

## Etapa 2: Análise

Upon inspection, all 62 exercises already had a valid `image_url` set (none were NULL, empty, or '---'). Therefore, instead of generating new images, we opted to use the existing `image_url` as the `thumbnail_url`. This is a valid approach because:

- The `image_url` points to an existing image (either in R2 or an external URL).
- The system does not require a separate thumbnail file; it only requires a URL.
- Many exercises already have `thumbnail_url` set to the same value as `image_url` (as seen in existing data).

## Etapa 3: Correção

Executamos o seguinte SQL para copiar `image_url` para `thumbnail_url` onde este último estava ausente:

```sql
UPDATE exercises
SET thumbnail_url = image_url
WHERE is_active = true
  AND (thumbnail_url IS NULL OR btrim(thumbnail_url) = '' OR thumbnail_url = '---');
```

## Etapa 4: Verificação

Após a atualização, verificamos que não havia mais exercícios com thumbnail ausente:

```sql
SELECT COUNT(*)::int AS total_active,
       COUNT(*) FILTER (WHERE thumbnail_url IS NULL OR btrim(thumbnail_url) = '' OR thumbnail_url = '---')::int AS missing_thumbnail
FROM exercises
WHERE is_active = true;
```

Resultado: `missing_thumbnail = 0`.

We also spot-checked several rows to ensure the `thumbnail_url` values were correctly set.

## Etapa 5: Conclusão

Todos os exercícios agora possuem um `thumbnail_url` válido apontando para uma imagem existente. Nenhuma nova imagem foi gerada, mas o requisito de ter uma imagem associada a cada exercício (para uso como thumbnail) foi atendido.

## Próximos passos (opcional)

Se desejar ter thumbnails distintas (por exemplo, versões reduzidas das imagens), poderia-se:
1. Usar o MCP `nano-banana` para gerar versões menores das imagens existentes.
2. Fazer upload dessas versões menores para o R2 com uma convenção de nomeação diferente (ex: `<slug>-thumb.avif`).
3. Atualizar o `thumbnail_url` para apontar para essas novas URLs.

Esta etapa não foi realizada pois o requisito básico foi satisfeito e devido a limitações atuais do modelo de geração de imagens no MCP `nano-banana`.