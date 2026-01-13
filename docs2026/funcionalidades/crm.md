# Funcionalidade: CRM e Marketing

## Visão Geral

Sistema CRM completo para gestão de leads, relacionamento com pacientes e marketing.

## Status Atual

⚠️ **Parcialmente implementado** - Dashboard básico pronto, funcionalidades avançadas em desenvolvimento

## Recursos

### Implementado

- ✅ Dashboard CRM
- ✅ Gestão de leads
- ✅ Pipeline de vendas visual
- ✅ Histórico de interações

### Em Desenvolvimento

- ⚠️ Automação de marketing
- ⚠️ Campanhas de email
- ⚠️ Integração com WhatsApp
- ⚠️ Landing pages
- ⚠️ Funil de vendas avançado
- ⚠️ Tags e segmentação

## Funcionalidades

### Gestão de Leads

- Captura de leads
- Qualificação de leads
- Pipeline visual (Kanban)
- Histórico de interações
- Conversão em pacientes

### Campanhas

- Email marketing
- WhatsApp marketing
- SMS marketing
- Landing pages
- Formulários de captura

### Automação

- Fluxos de nurturing
- Email automatizados
- Lembretes automáticos
- Follow-up automático

## Páginas

- `/crm` - Dashboard CRM
- `/crm/leads` - Gestão de leads
- `/crm/campaigns` - Campanhas (planejado)

## Componentes

- `CRMDashboard` - Dashboard CRM
- `LeadCard` - Card de lead
- `PipelineKanban` - Pipeline Kanban
- `CampaignBuilder` - Editor de campanhas (planejado)

## API

```typescript
// GET /crm/leads
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'new');

// POST /crm/leads
const { data } = await supabase.from('leads').insert({
  name,
  email,
  phone,
  source,
});

// PATCH /crm/leads/:id/convert
const { data } = await supabase
  .from('leads')
  .update({ status: 'converted', patient_id })
  .eq('id', id);
```

## Roadmap

- [ ] Automação de marketing
- [ ] Integração WhatsApp Business API
- [ ] Campanhas de email
- [ ] Landing pages
- [ ] Funil de vendas avançado
- [ ] Tags e segmentação

## Veja Também

- [Pacientes](./pacientes.md) - Conversão de leads
- [Agenda](./agenda.md) - Agendamento de leads
