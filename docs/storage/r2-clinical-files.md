# Política de Arquivos Clínicos (Cloudflare R2)

## 1. Visão Geral
O FisioFlow lida com anexos pesados e sensíveis: laudos médicos, ressonâncias, vídeos de análise biomecânica e relatórios em PDF. 
Não salvamos binários no banco de dados Neon Postgres. Em vez disso, utilizamos o **Cloudflare R2**, que possui taxa de egress (transferência) zero e armazenamento escalável.

## 2. Tipos de Buckets (Isolamento Físico)
O `wrangler.toml` define 3 bindings distintas para isolar o tipo de tráfego e facilitar regras de retenção (Lifecycle Rules):
- `MEDIA_BUCKET` (`fisioflow-media`): Vídeos, imagens públicas, avatares, fotos de exercícios.
- `EXAMS_BUCKET` (`fisioflow-exams`): PDFs, DICOM, laudos de exames radiológicos.
- `CLINICAL_DOCS_BUCKET` (`fisioflow-clinical-docs`): Guias, relatórios emitidos pela IA, contratos assinados e recibos.

## 3. Segurança e Acesso
**Regra de Ouro:** Arquivos clínicos NUNCA ficam com visibilidade pública habilitada no R2. Nenhuma chave do R2 é entregue para o frontend diretamente.

O fluxo de acesso é sempre mediado pela API Hono no Cloudflare Workers:
1. Cliente envia requisição autenticada com token JWT (Neon Auth).
2. O Endpoint verifica se o `organizationId` do usuário/paciente bate com o arquivo solicitado.
3. O serviço `r2StorageService.ts` busca o objeto restrito usando o binding interno.
4. O Worker retorna a stream de resposta (ou gera uma Signed URL curta de 10 minutos para downloads pesados).

## 4. Padronização de Caminhos (Object Keys)
Para evitar conflitos (UUID collisions) e facilitar a auditoria via Cloudflare Dashboard, toda Key respeita a taxonomia multitenant:
`{organizationId}/{category}/{patientId}/{uuid}-{fileName}`
*Se o arquivo não pertence a um paciente (ex: logo da clínica), o patientId recebe o valor "global".*

## 5. Metadata Obrigatória
Para manter conformidade com LGPD (Auditoria), o arquivo salvo recebe Metadados Estendidos (Custom Metadata):
- `organizationId`
- `uploadedBy` (userId de quem subiu a foto/documento)
- `patientId` (Dono do dado clínico)
- `category`
Isso permite que scripts futuros varram o bucket e deletem dados em massa caso um paciente revogue o consentimento LGPD.

## 6. Prevenção de Malware
O serviço (`validateFile`) bloqueia hard-coded o upload de executáveis, bash scripts e artefatos maliciosos `.exe, .sh, .bat`, retornando `SECURITY_ERROR`. Limite máximo é travado em 50MB no Worker para evitar abuso de memória (Payload Too Large).
