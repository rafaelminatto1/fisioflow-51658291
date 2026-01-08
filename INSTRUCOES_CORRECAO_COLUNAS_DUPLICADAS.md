# Instruções para Correção de Colunas Duplicadas - FisioFlow

## Resumo das Correções Implementadas

Foram criadas **4 migrations** para resolver todos os problemas de colunas duplicadas e inconsistências identificadas:

1. ✅ **Parte 1**: Migrar dados das colunas antigas para as novas
2. ✅ **Parte 2**: Remover colunas antigas e atualizar funções
3. ✅ **Padronização**: Renomear `patients.name` para `patients.full_name`
4. ✅ **Correção de FK**: Corrigir `prom_snapshots.patient_id` para referenciar `patients`

---

## Arquivos Criados/Modificados

### Migrations SQL
- `supabase/migrations/20260108180000_fix_duplicate_columns_part1.sql`
- `supabase/migrations/20260108180001_fix_duplicate_columns_part2.sql`
- `supabase/migrations/20260108180002_fix_name_fullname_consistency.sql`
- `supabase/migrations/20260108180003_fix_prom_snapshots_fk.sql`

### Código TypeScript Atualizado
- `src/hooks/useAppointments.tsx` - Atualizado para usar colunas padronizadas
- `src/components/schedule/AppointmentModalRefactored.tsx` - Atualizado para usar colunas padronizadas
- `src/types/appointment.ts` - Atualizado tipos para suportar colunas novas e antigas (backward compatibility)

### Scripts de Teste
- `test-migrations.mjs` - Script para verificar estrutura atual do banco

### Documentação
- `ANALISE_COLUNAS_DUPLICADAS.md` - Análise completa dos problemas

---

## Instruções de Aplicação

### Passo 1: Backup do Banco de Dados

**CRÍTICO**: Faça um backup completo antes de aplicar as migrations:

```bash
# Via Supabase CLI
supabase db dump -f backup_antes_correcoes_$(date +%Y%m%d_%H%M%S).sql

# Ou via Dashboard do Supabase:
# 1. Acesse https://app.supabase.com
# 2. Selecione seu projeto
# 3. Vá em Settings > Database > Backups
# 4. Crie um backup manual
```

---

### Passo 2: Aplicar Migrations na Ordem Correta

As migrations **DEVEM** ser aplicadas nesta ordem:

#### 2.1. Testar Estrutura Atual (Opcional)

```bash
# Executar script de teste para verificar estado atual
node test-migrations.mjs
```

Este script mostrará:
- Quais colunas existem atualmente
- Se há dados inconsistentes
- Status das views

#### 2.2. Aplicar Migration Parte 1

```bash
# Via Supabase CLI
supabase db push

# Ou via Dashboard do Supabase:
# 1. SQL Editor
# 2. Cole o conteúdo de 20260108180000_fix_duplicate_columns_part1.sql
# 3. Execute
```

**O que esta migration faz:**
- ✅ Migra dados de `appointment_date` para `date`
- ✅ Migra dados de `appointment_time` para `start_time`
- ✅ Cria tabela temporária de comparação para verificação
- ✅ Atualiza views para usar as novas colunas
- ✅ Adiciona comentários explicativos

#### 2.3. Aplicar Migration Parte 2

```bash
supabase db push
```

**O que esta migration faz:**
- ✅ Remove colunas antigas `appointment_date` e `appointment_time`
- ✅ Atualiza índices para usar as novas colunas
- ✅ Atualiza funções de verificação de conflitos
- ✅ Limpa tabela temporária de comparação

#### 2.4. Aplicar Migration de Consistência de Nomes

```bash
supabase db push
```

**O que esta migration faz:**
- ✅ Renomeia `patients.name` para `patients.full_name`
- ✅ Atualiza todas as views para usar `full_name` consistentemente
- ✅ Atualiza comentários da tabela

#### 2.5. Aplicar Migration de Correção de FK

```bash
supabase db push
```

**O que esta migration faz:**
- ✅ Corrige a FK de `prom_snapshots.patient_id` para referenciar `patients`
- ✅ Recria view `prom_snapshots_summary` se necessário

---

### Passo 3: Verificar Resultados

#### 3.1. Executar Script de Teste Novamente

```bash
node test-migrations.mjs
```

**Verifique:**
- ✅ Apenas `date` e `start_time` existem (sem as antigas)
- ✅ Apenas `full_name` existe na tabela `patients`
- ✅ Todas as views funcionam corretamente
- ✅ Sem inconsistências nos dados de amostra

#### 3.2. Testar Aplicação Localmente

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Ou
bun run dev
```

**Testes manuais:**
1. ✅ Abrir agenda e verificar se agendamentos aparecem
2. ✅ Criar um novo agendamento
3. ✅ Editar um agendamento existente
4. ✅ Cancelar um agendamento
5. ✅ Verificar relatórios e views
6. ✅ Abrir console do navegador e verificar se há erros

#### 3.3. Verificar Logs de Erro

```bash
# Verificar logs do Supabase (via CLI)
supabase logs

# Ou via Dashboard:
# Database > Logs > Verificar erros recentes
```

---

### Passo 4: Deploy em Produção (após testes locais)

#### 4.1. Verificar TypeScript Types

```bash
# Regenerar tipos do Supabase
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

#### 4.2. Build e Teste de Produção

```bash
# Build para produção
npm run build

# Testar build localmente
npm run preview
```

#### 4.3. Deploy

```bash
# Deploy para Vercel (ou sua plataforma)
vercel --prod

# Ou via Vercel Dashboard:
# Push das mudanças para main
```

---

## Solução de Problemas

### Problema: Migration Falha com "Column does not exist"

**Causa**: A migration tenta acessar uma coluna que não existe.

**Solução**:
1. Verifique qual migration falhou
2. Abra a migration e adicione `IF EXISTS` onde necessário
3. Reaplique a migration

Exemplo:
```sql
-- Antes:
ALTER TABLE appointments ALTER COLUMN date SET NOT NULL;

-- Depois:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'appointments' AND column_name = 'date')
  THEN
    ALTER TABLE appointments ALTER COLUMN date SET NOT NULL;
  END IF;
END $$;
```

---

### Problema: TypeScript Errors após Migrations

**Causa**: Tipos do Supabase não estão sincronizados.

**Solução**:
```bash
# Regenerar tipos
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Reiniciar servidor
npm run dev
```

---

### Problema: Views Quebradas após Migrations

**Causa**: Views ainda referenciam colunas antigas.

**Solução**:
1. A migration Parte 2 recria todas as views automaticamente
2. Se ainda tiver problemas, recrie manualmente:
```sql
DROP VIEW IF EXISTS public.appointments_full CASCADE;
CREATE VIEW public.appointments_full AS
SELECT ...
FROM public.appointments a
-- ...
```

---

### Problema: Dados Perdidos após Migration

**Causa**: Os dados não foram migrados corretamente.

**Solução**: Restaura do backup e verifica a migration Parte 1:

1. Restaura o backup do Passo 1
2. Verifica a tabela temporária `appointment_column_comparison`
3. Corrige dados inconsistentes manualmente
4. Reaplica as migrations

---

## Backward Compatibility

As mudanças foram feitas com **backward compatibility** para garantir que:

✅ **Código TypeScript** suporta tanto colunas novas quanto antigas
✅ **Validação** checa `date` OU `appointment_date`
✅ **Priorização**: Colunas novas têm prioridade sobre antigas
✅ **Sem Breaking Changes** em API existente

Exemplo no código:
```typescript
// Prioriza a nova coluna, mas usa a antiga como fallback
const dateStr = data.date || data.appointment_date;
const timeStr = data.start_time || data.appointment_time;
```

---

## Rollback (Se Necessário)

Se você precisar reverter as mudanças:

### Opção 1: Restaurar do Backup

```bash
# Restaura o backup criado no Passo 1
supabase db reset --file backup_antes_correcoes_YYYYMMDD_HHMMSS.sql
```

### Opção 2: Migration de Rollback Manual

Crie uma migration nova para reverter:

```sql
-- Reverter colunas antigas
ALTER TABLE appointments ADD COLUMN appointment_date DATE;
ALTER TABLE appointments ADD COLUMN appointment_time TIME;

-- Migrar dados de volta
UPDATE appointments
SET appointment_date = date
WHERE appointment_date IS NULL;

UPDATE appointments
SET appointment_time = start_time
WHERE appointment_time IS NULL;

-- Remover colunas novas
ALTER TABLE appointments DROP COLUMN date;
ALTER TABLE appointments DROP COLUMN start_time;

-- Renomear de volta
ALTER TABLE patients RENAME COLUMN full_name TO name;
```

---

## Checklist de Validação

- [ ] Backup criado antes de começar
- [ ] Teste inicial executado (`node test-migrations.mjs`)
- [ ] Migration Parte 1 aplicada com sucesso
- [ ] Migration Parte 2 aplicada com sucesso
- [ ] Migration de nomes aplicada com sucesso
- [ ] Migration de FK aplicada com sucesso
- [ ] Teste pós-migration executado (`node test-migrations.mjs`)
- [ ] Aplicação local testada sem erros
- [ ] TypeScript types regenerados
- [ ] Build de produção bem-sucedido
- [ ] Deploy em produção concluído
- [ ] Monitoramento de produção iniciado

---

## Monitoramento Pós-Deploy

Após aplicar as migrations, monitore:

### Métricas no Supabase Dashboard
- ✅ **Error Rate**: Deve estar perto de 0%
- ✅ **Query Performance**: Queries usando `date`/`start_time` devem ser mais rápidas
- ✅ **Storage Size**: Deve diminuir (remoção de colunas duplicadas)

### Logs da Aplicação
- ✅ Console do navegador: Verificar se há erros JavaScript
- ✅ Network tab: Verificar se há falhas em requests
- ✅ Backend logs: Verificar se há erros no Supabase

### Funcionalidade Específica
- ✅ Criação de agendamentos
- ✅ Edição de agendamentos
- ✅ Cancelamento de agendamentos
- ✅ Visualização da agenda
- ✅ Relatórios e estatísticas

---

## Contato e Suporte

Se encontrar problemas durante a aplicação:

1. **Verifique os logs**: Logs do Supabase e da aplicação
2. **Consulte a análise**: `ANALISE_COLUNAS_DUPLICADAS.md`
3. **Tente rollback**: Use o backup para restaurar estado anterior
4. **Abra uma issue**: Documente o problema com logs detalhados

---

## Documentos Relacionados

- `ANALISE_COLUNAS_DUPLICADAS.md` - Análise técnica completa
- `ANALISE_SUPABASE_DB_COMPLETA.md` - Análise geral do banco
- `DEPLOY_STATUS.md` - Status de deploy e migrations
- `supabase/migrations/` - Todas as migrations do projeto

---

**Data de Criação**: 08/01/2026
**Versão**: 1.0
**Status**: ✅ Pronto para Aplicação
