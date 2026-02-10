# Plano de Implementação - Skills Integration no FisioFlow

## Visão Geral

Este documento detalha a implementação das funcionalidades das Claude Skills nas páginas existentes do FisioFlow.

---

## 📊 Mapeamento de Funcionalidades por Página

### FASE 1: Qualidade e Testes

| Funcionalidade | Página | Ação |
|----------------|--------|-------|
| Changelog Automático | Todas | Adicionar botão de changelog em configurações |
| Testes Críticos E2E | - | Já movidos para e2e/ |
| Testes Acessibilidade | - | Já movidos para e2e/ |

---

### FASE 2: Documentos (PDF/XLSX/DOCX)

| Funcionalidade | Página | Prioridade |
|----------------|--------|-----------|
| **Gerar PDF de Atestado** | `/cadastros/AtestadosPage` | ALTA |
| **Gerar PDF de Evolução** | `/SessionEvolutionPage` | ALTA |
| **Exportar Pacientes XLSX** | `/MedicalRecord` | ALTA |
| **Exportar Financeiro XLSX** | `/financeiro/FluxoCaixaPage` | MÉDIA |
| **Exportar Relatórios XLSX** | `/relatorios/*` | MÉDIA |
| **DOCX Editável** | `/cadastros/AtestadosPage` | BAIXA |

---

### FASE 3: Integrações Externas

| Funcionalidade | Página | Prioridade |
|----------------|--------|-----------|
| **Google Calendar Sync** | `/Eventos` | MÉDIA |
| **Email Notifications** | `/Communications` | ALTA |
| **Notion Docs** | `/Wiki` | BAIXA |

---

### FASE 4: Conteúdo e Marketing

| Funcionalidade | Página | Prioridade |
|----------------|--------|-----------|
| **Blog Content Generator** | `/marketing/*` | BAIXA |
| **Video Exercise Import** | `/Exercises` | BAIXA |
| **Patient Communication** | `/Communications` | ALTA |

---

## 🔧 Implementação Detalhada

### 1. Atestados Page - Gerar PDF

**Arquivo:** `/src/pages/cadastros/AtestadosPage.tsx`

**Adicionar:**
- Botão "Gerar PDF" no card de cada template
- Seletor de paciente
- Preview do PDF antes de download
- Integração com `PDFGeneratorFactory`

### 2. Session Evolution - Gerar PDF de Evolução

**Arquivo:** `/src/pages/SessionEvolutionPage.tsx`

**Adicionar:**
- Botão "Exportar Evolução em PDF"
- Seleção de período das evoluções
- Opção de incluir anexos
- Assinatura digital do profissional

### 3. MedicalRecord - Exportar Pacientes

**Arquivo:** `/src/pages/MedicalRecord.tsx`

**Adicionar:**
- Botão "Exportar para Excel"
- Filtros de exportação (ativos/inativos, período)
- Seleção de colunas
- Template de importação

### 4. Communications - WhatsApp e Email

**Arquivo:** `/src/pages/Communications.tsx`

**Adicionar:**
- Templates de mensagens pré-definidas
- Campanhas de reativação
- Lembretes de exercícios
- Pesquisas de satisfação

### 5. Configurações - Changelog e Integrações

**Arquivo:** `/src/pages/*Settings.tsx` (criar)

**Adicionar:**
- Seção de Integrações (Google Calendar, Notion, Email)
- Botão "Gerar Changelog"
- Configurações de API

---

## 📁 Estrutura de Arquivos Criados

```
src/lib/skills/
├── fase1-changelog/
│   ├── generate-changelog.js
│   └── CHANGELOG_STYLE.md
├── fase2-documentos/
│   ├── pdf-generator.ts
│   ├── xlsx-integration.ts
│   └── docx-templates.ts
├── fase3-integracoes/
│   ├── google-calendar-sync.ts
│   ├── email-notifications.ts
│   └── notion-integration.ts
└── fase4-conteudo/
    ├── blog-content-generator.ts
    ├── video-exercise-import.ts
    └── patient-communication.ts
```

---

## ✅ Checklist de Implementação

### Fase 1: Configuração Base
- [x] Instalar dependências (docx, file-saver, @notionhq/client)
- [x] Mover testes para e2e/
- [x] Criar aliases no tsconfig.json
- [ ] Atualizar scripts package.json (já feito)

### Fase 2: PDF e Documentos
- [ ] Hook `usePDFGenerator` - wrapper para gerar PDFs
- [ ] Hook `useExcelExport` - wrapper para exportar XLSX
- [ ] Componente `PDFPreviewModal` - preview de PDFs
- [ ] Botão "Exportar Excel" em MedicalRecord
- [ ] Botão "Gerar PDF" em AtestadosPage
- [ ] Botão "Exportar Evolução PDF" em SessionEvolutionPage

### Fase 3: Integrações
- [ ] Hook `useGoogleCalendarSync` - sincronização
- [ ] Hook `useEmailNotifications` - emails
- [ ] Página de configurações de integrações
- [ ] Toggle de sync de agenda no Eventos

### Fase 4: Conteúdo
- [ ] Hook `useContentGenerator` - gerar conteúdo
- [ ] Hook `useVideoImporter` - importar vídeos
- [ ] Hook `usePatientCommunication` - WhatsApp
- [ ] Templates de mensagens em Communications

---

## 🚀 Execução

A implementação seguirá esta ordem:

1. **Hooks utilitários** - wrappers TypeScript para skills
2. **Componentes UI** - modais e botões
3. **Integração nas páginas** - adicionar funcionalidades
4. **Testes** - validar cada implementação
