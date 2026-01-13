# 📚 FisioFlow - Documentação Oficial 2026

Bem-vindo à documentação oficial do **FisioFlow** - Sistema de Gestão Completo para Clínicas de Fisioterapia.

## 🎯 Sobre esta Documentação

Esta documentação foi criada para fornecer uma referência completa para desenvolvedores, administradores de sistema e qualquer pessoa que deseje entender ou contribuir com o projeto FisioFlow.

## 📖 Como Usar esta Documentação

### Para Começar Rápido
Se você é novo no projeto, comece por:
1. [Visão Geral](./01-visao-geral.md) - Entenda o que é o FisioFlow
2. [Guia de Início Rápido](./guias/inicio-rapido.md) - Configure seu ambiente
3. [Estrutura do Projeto](./04-estrutura-projeto.md) - Entenda a organização do código

### Para Desenvolvedores
Se você vai desenvolver ou contribuir:
1. [Ambiente de Desenvolvimento](./03-ambiente-desenvolvimento.md)
2. [Arquitetura](./02-arquitetura.md)
3. [Componentes UI](./08-componentes-ui.md)
4. [Guia de Contribuição](./12-guia-contribuicao.md)

### Para Administradores
Se você vai configurar ou manter o sistema:
1. [Configuração Supabase](./guias/configuracao-supabase.md)
2. [Configuração Vercel](./guias/configuracao-vercel.md)
3. [Deploy em Produção](./11-deploy-producao.md)

### Para Entender Funcionalidades
Se você quer entender as funcionalidades disponíveis:
1. [Funcionalidades](./funcionalidades/)
2. [Roadmap](./13-roadmap.md) - Veja o que está por vir

## 📑 Índice da Documentação

### 📚 Documentos Principais

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [01. Visão Geral](./01-visao-geral.md) | Overview do projeto, funcionalidades e stack | ✅ |
| [02. Arquitetura](./02-arquitetura.md) | Arquitetura técnica, diagramas e decisões | ✅ |
| [03. Ambiente de Desenvolvimento](./03-ambiente-desenvolvimento.md) | Setup e configuração do ambiente | ✅ |
| [04. Estrutura do Projeto](./04-estrutura-projeto.md) | Organização de pastas e arquivos | ✅ |
| [05. Banco de Dados](./05-banco-dados.md) | Schema, migrations e RLS policies | ✅ |
| [06. Autenticação e Segurança](./06-autenticacao-seguranca.md) | Auth, roles, permissões e LGPD | ✅ |
| [07. APIs e Integrações](./07-api-integracoes.md) | Edge Functions e integrações | ✅ |
| [08. Componentes UI](./08-componentes-ui.md) | Design System e componentes | ✅ |
| [09. Estado e Forms](./09-estado-forms.md) | State management e validações | ✅ |
| [10. Testes e Qualidade](./10-testes-qualidade.md) | Estratégia de testes e qualidade | ✅ |
| [11. Deploy e Produção](./11-deploy-producao.md) | Deploy, monitoramento e backups | ✅ |
| [12. Guia de Contribuição](./12-guia-contribuicao.md) | Como contribuir com o projeto | ✅ |
| [13. Roadmap](./13-roadmap.md) | Futuro do projeto e melhorias | ✅ |

### 📘 Guias Práticos

| Guia | Descrição | Link |
|------|-----------|------|
| Início Rápido | Setup rápido do ambiente | [Ver](./guias/inicio-rapido.md) |
| Configuração Supabase | Setup completo do Supabase | [Ver](./guias/configuracao-supabase.md) |
| Configuração Vercel | Deploy na Vercel | [Ver](./guias/configuracao-vercel.md) |
| Desenvolvimento Local | Ambiente local completo | [Ver](./guias/desenvolvimento-local.md) |
| Debug & Troubleshooting | Resolução de problemas | [Ver](./guias/debug-troubleshooting.md) |
| Otimização de Performance | Melhorias de performance | [Ver](./guias/otimizacao-performance.md) |

### 📗 Referências Técnicas

| Referência | Descrição | Link |
|------------|-----------|------|
| TypeScript Types | Tipos principais do sistema | [Ver](./referencias/tipos-ts.md) |
| Hooks Customizados | Hooks disponíveis | [Ver](./referencias/hooks-customizados.md) |
| Componentes Reutilizáveis | Componentes UI | [Ver](./referencias/componentes-reutilizaveis.md) |
| Utilitários | Funções auxiliares | [Ver](./referencias/utilitarios.md) |
| Validações | Schema de validações | [Ver](./referencias/validacoes.md) |
| Constantes | Constantes globais | [Ver](./referencias/constantes.md) |

### 📕 Funcionalidades

| Funcionalidade | Descrição | Link |
|----------------|-----------|------|
| Pacientes | Gestão completa de pacientes | [Ver](./funcionalidades/pacientes.md) |
| Agenda | Sistema de agendamento | [Ver](./funcionalidades/agenda.md) |
| Prontuário | Prontuário eletrônico SOAP | [Ver](./funcionalidades/prontuario.md) |
| Exercícios | Biblioteca de exercícios | [Ver](./funcionalidades/exercicios.md) |
| Financeiro | Gestão financeira | [Ver](./funcionalidades/financeiro.md) |
| Relatórios | Analytics e relatórios | [Ver](./funcionalidades/relatorios.md) |
| Telemedicina | Telemedicina e videoconferência | [Ver](./funcionalidades/telemedicina.md) |
| Avaliações | Fichas de avaliação | [Ver](./funcionalidades/avaliacoes.md) |
| Gamificação | Sistema de gamificação | [Ver](./funcionalidades/gamificacao.md) |
| CRM | CRM e marketing | [Ver](./funcionalidades/crm.md) |

## 🚀 Stack Tecnológico

```
Frontend:  React 18 + TypeScript + Vite
UI:        shadcn/ui + Tailwind CSS
Backend:   Supabase (PostgreSQL + Auth + Real-time + Storage)
Deploy:    Vercel Pro
Monitor:   Sentry + Vercel Analytics
Mobile:    Capacitor (iOS/Android)
```

## 🎯 Público-Alvo

- **Desenvolvedores**: Para contribuir e estender o sistema
- **Administradores**: Para configurar e manter a infraestrutura
- **Fisioterapeutas**: Para entender as funcionalidades clínicas
- **Gestores**: Para entender as capacidades do sistema

## 📞 Suporte

- 📧 Email: suporte@fisioflow.com
- 💬 Discord: [Servidor do FisioFlow](https://discord.gg/fisioflow)
- 🐛 Issues: [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)
- 📖 Wiki: [Documentação adicional](https://github.com/fisioflow/fisioflow/wiki)

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](../LICENSE) para detalhes.

## 🔗 Links Úteis

- [Repositório Principal](https://github.com/fisioflow/fisioflow)
- [Site Oficial](https://fisioflow.com)
- [Aplicação em Produção](https://app.fisioflow.com)
- [Status da API](https://status.fisioflow.com)

---

**Última atualização**: Janeiro 2026
**Versão**: 2.0.0
**Documentação mantida por**: Equipe FisioFlow
