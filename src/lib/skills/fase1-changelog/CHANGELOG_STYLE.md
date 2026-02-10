# Guia de Estilo para Changelog do FisioFlow

Este documento define o padrão para escrever changelogs do FisioFlow, seguindo as melhores práticas da indústria e adaptado para o contexto de saúde/fisioterapia.

## Estrutura do Changelog

```markdown
# [Versão] - [Data]

## ⚠️ Mudanças que Rompem (Breaking Changes)
- Lista de mudanças que podem quebrar integrações ou fluxos existentes

## ✨ Novas Funcionalidades
- Novidades adicionadas ao sistema

## 🐛 Correções
- Bugs corrigidos

## ⚡ Performance
- Melhorias de performance

## 📝 Documentação
- Atualizações na documentação

## 📋 Por Módulo
### Gestão de Pacientes
- Mudanças específicas deste módulo

### Agendamento
- Mudanças específicas deste módulo

### Evolução Clínica
- Mudanças específicas deste módulo
```

## Formato de Commits

Usamos **Conventional Commits** para garantir consistência:

```
<tipo>[<escopo>]: <descrição>

[opcional: corpo com mais detalhes]

[opcional: rodapé com metadados]
```

### Tipos Suportados

| Tipo | Ícone | Uso |
|------|-------|-----|
| `feat` | ✨ | Nova funcionalidade |
| `fix` | 🐛 | Correção de bug |
| `perf` | ⚡ | Melhoria de performance |
| `refactor` | ♻️ | Refatoração de código |
| `docs` | 📝 | Alterações em documentação |
| `test` | ✅ | Adição ou modificação de testes |
| `chore` | 🔧 | Tarefas de manutenção |
| `style` | 💅 | Formatação de código |
| `ci` | 👷 | Configurações de CI/CD |
| `build` | 📦 | Sistema de build |

### Escopos do FisioFlow

| Escopo | Descrição |
|--------|-----------|
| `patients` | Gestão de Pacientes |
| `schedule` | Agendamento |
| `evolution` | Evolução Clínica (SOAP) |
| `exercises` | Biblioteca de Exercícios |
| `telemedicine` | Telemedicina |
| `reports` | Relatórios |
| `auth` | Autenticação/Permissões |
| `mobile` | Apps Mobile |
| `ui` | Interface de Usuário |
| `api` | API/Backend |

## Exemplos de Commits

### Boas Práticas

```bash
# Adiciona nova funcionalidade
git commit -m "feat(patients): add photo upload for patient profile"

# Corrige bug
git commit -m "fix(schedule): resolve conflict when booking overlapping appointments"

# Breaking change
git commit -m "feat(api)!: change user response structure to include role field"

# Documentação
git commit -m "docs: update installation guide with new Firebase setup"
```

### Evitar

```bash
# Muito vago
git commit -m "update stuff"

# Muito longo
git commit -m "feat: add a new feature that allows users to do something really complicated..."

# Sem contexto
git commit -m "fixed bug"
```

## Pontos de Lançamento (Release Notes)

Para comunicação com usuários finais (fisioterapeutas), criar versão simplificada:

```markdown
# O Que Há de Novo - Versão X.Y.Z

## Para os Profissionais de Saúde

🆕 **Agendamento Inteligente**
O sistema agora sugere os melhores horários baseados no histórico do paciente.

🔧 **Correções**
- Corrigimos um problema ao adicionar anexos na evolução clínica.
- Melhoramos a estabilidade do vídeo na telemedicina.

## Para a Equipe de TI

### Mudanças Técnicas
- Atualizado React para v19.1.0
- Migrado de Supabase para Firebase Auth
- Adicionado testes E2E para fluxo de agendamento

### Breaking Changes
- A API de pacientes agora requer o campo `organizationId`
```

## Geração Automática

Use o script `generate-changelog.js`:

```bash
# Desde o último release
node skills-integration/fase1-changelog/generate-changelog.js

# Últimos 7 dias
node skills-integration/fase1-changelog/generate-changelog.js --days=7

# Desde versão específica
node skills-integration/fase1-changelog/generate-changelog.js --since=v2.5.0

# Salvar no CHANGELOG.md
node skills-integration/fase1-changelog/generate-changelog.js --output=CHANGELOG.md
```

## Integração com package.json

Adicionar ao package.json:

```json
{
  "scripts": {
    "changelog": "node skills-integration/fase1-changelog/generate-changelog.js --output=CHANGELOG.md",
    "changelog:week": "node skills-integration/fase1-changelog/generate-changelog.js --days=7",
    "changelog:since": "node skills-integration/fase1-changelog/generate-changelog.js"
  }
}
```

## Checklist Antes de Release

- [ ] Todos os commits seguem Conventional Commits
- [ ] Changelog gerado e revisado
- [ ] Versão atualizada em package.json
- [ ] Tag de versão criada (git tag)
- [ ] Release notes preparados para usuários finais
