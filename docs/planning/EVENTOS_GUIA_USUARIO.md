# Sistema de Eventos - FisioFlow

## Visão Geral

O Sistema de Eventos do FisioFlow permite gerenciar corridas, eventos corporativos, ativações e outros eventos da clínica de fisioterapia Activity.

## Funcionalidades Principais

### 1. Gestão de Eventos

**Criar Evento:**
1. Acesse "Eventos" no menu lateral
2. Clique em "Novo Evento"
3. Preencha os dados obrigatórios:
   - Nome do evento
   - Categoria (corrida, corporativo, ativação, outro)
   - Local
   - Data de início e fim
4. Dados opcionais:
   - Descrição
   - Link do WhatsApp
   - Marcar como gratuito
   - Valor padrão para prestadores

**Editar Evento:**
1. Na lista de eventos, clique nos três pontos (⋮)
2. Selecione "Editar"
3. Modifique os campos desejados
4. Clique em "Salvar Alterações"

**Visualizar Detalhes:**
1. Clique em "Ver Detalhes" no card do evento
2. Navegue pelas abas:
   - **Prestadores:** gerenciar profissionais contratados
   - **Checklist:** controlar itens necessários
   - **Participantes:** cadastrar e gerenciar participantes
   - **Financeiro:** visualizar resumo de custos

### 2. Gerenciamento de Prestadores

**Adicionar Prestador:**
1. Na página de detalhes do evento, vá para a aba "Prestadores"
2. Clique em "Adicionar Prestador"
3. Preencha:
   - Nome (obrigatório)
   - Contato
   - CPF/CNPJ
   - Valor acordado

**Marcar Pagamento:**
- Clique no badge de status (PENDENTE/PAGO) para alternar

**Exportar CSV:**
- Clique em "Exportar CSV" para baixar a lista de prestadores

### 3. Sistema de Checklist

**Adicionar Item:**
1. Vá para a aba "Checklist"
2. Clique em "Adicionar Item"
3. Defina:
   - Título do item
   - Tipo (levar, alugar, comprar)
   - Quantidade
   - Custo unitário

**Marcar como Concluído:**
- Clique na checkbox ao lado do item

**Visualizar Totais:**
- O sistema calcula automaticamente:
  - Custo total do checklist
  - Custo por tipo (levar, alugar, comprar)

### 4. Gestão de Participantes

**Cadastrar Participante:**
1. Aba "Participantes" → "Adicionar Participante"
2. Preencha:
   - Nome (obrigatório)
   - Contato
   - Instagram (@usuario ou URL)
   - Marque se segue o perfil
   - Observações

**Exportar Participantes:**
- Clique em "Exportar CSV" para download

**Métricas:**
- Total de participantes
- Quantos seguem o perfil da clínica
- Percentual de seguidores

### 5. Dashboard Financeiro

O resumo financeiro do evento mostra:

**Custo Total:**
- Soma de prestadores + insumos + outros pagamentos

**Detalhamento:**
- **Prestadores:** total acordado e status de pagamento
- **Insumos:** custos do checklist por tipo
- **Outros Pagamentos:** pagamentos diversos registrados

**Status de Pagamentos:**
- Valor total pago
- Valor pendente
- Lista de prestadores por status

### 6. Filtros e Busca

**Filtrar Eventos:**
- Por status: Agendado, Em Andamento, Concluído, Cancelado
- Por categoria: Corrida, Corporativo, Ativação, Outro
- Por nome ou local (busca em tempo real)

## Controle de Acesso (RBAC)

### Administradores
- Acesso completo a todos os eventos
- Pode criar, editar e deletar eventos
- Gerencia prestadores e pagamentos

### Fisioterapeutas
- Pode criar e editar eventos
- Gerencia prestadores
- Acessa relatórios financeiros
- Não pode deletar eventos

### Estagiários
- Apenas visualização de eventos
- Pode adicionar participantes
- Pode marcar itens do checklist como concluídos
- Acesso limitado a dados financeiros

## Estatísticas e Relatórios

### Dashboard Principal
Visualize no dashboard:
- Total de eventos (por status)
- Total de participantes
- Percentual de participantes que seguem o perfil
- Custo total de todos os eventos
- Prestadores pendentes de pagamento

### Exportação de Dados
- **Prestadores:** CSV com nome, contato, CPF/CNPJ, valor e status
- **Participantes:** CSV com nome, contato, Instagram e se segue o perfil

## Fluxo Típico de Uso

### Antes do Evento
1. Criar o evento com todas as informações básicas
2. Cadastrar prestadores necessários
3. Montar o checklist de itens
4. Definir valores e orçamento

### Durante o Cadastro
1. Adicionar participantes conforme chegam
2. Marcar quem segue o perfil da clínica
3. Atualizar checklist (marcar itens como OK)

### Após o Evento
1. Marcar status do evento como "Concluído"
2. Atualizar status de pagamentos dos prestadores
3. Exportar listas para análise
4. Revisar custos totais e margem

## Dicas e Boas Práticas

✅ **Use categorias consistentes** para facilitar filtros e relatórios

✅ **Atualize status regularmente** para ter visão precisa da operação

✅ **Exporte dados frequentemente** para backup e análises externas

✅ **Use o campo Observações** nos participantes para notas importantes

✅ **Mantenha o checklist atualizado** para evitar surpresas no dia do evento

✅ **Configure valores padrão** de prestadores para agilizar cadastros

## Suporte e Ajuda

Para dúvidas ou suporte:
- Entre em contato com a equipe técnica
- Consulte a documentação completa do FisioFlow
- Reporte bugs através do sistema de tickets

---

**Versão:** 1.0  
**Última atualização:** 2025-10-06
