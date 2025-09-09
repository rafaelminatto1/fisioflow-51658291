# 🏥 FisioFlow - Sistema de Gestão para Fisioterapia

Sistema completo de gestão para clínicas de fisioterapia, desenvolvido com React + TypeScript + Supabase.

## 🚀 Funcionalidades Principais

### 👥 **Gestão de Pacientes**
- Cadastro completo de pacientes com histórico médico
- Upload de documentos e exames
- Controle de acesso baseado em funções (RBAC)
- Conformidade com LGPD

### 📅 **Agendamento de Consultas**
- Calendário avançado com visualizações (semana/dia/mês)
- Detecção automática de conflitos
- Consultas recorrentes
- Notificações automáticas

### 📝 **Prontuários Eletrônicos (SOAP)**
- Sistema completo de notas SOAP
- Assinaturas digitais
- Trilhas de auditoria
- Integração com planos de tratamento

### 💪 **Gestão de Exercícios**
- Biblioteca completa de exercícios com filtros avançados
- Prescrição personalizada de exercícios
- Acompanhamento de progresso em tempo real
- Protocolos baseados em evidências científicas
- Integração com registros SOAP

### 📊 **Analytics e Relatórios**
- Dashboard em tempo real
- Métricas de adesão dos pacientes
- Relatórios de progresso
- Análises de tendências

## 🛠 Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Autenticação**: Supabase Auth com RLS
- **Deploy**: Vercel / Netlify ready

## 📋 Requisitos do Sistema

- Node.js 18+
- npm ou yarn
- Conta no Supabase

## ⚡ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/fisioflow.git
cd fisioflow
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Renomeie `.env.example` para `.env` e configure:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 4. Configure o banco de dados
Execute as migrações SQL no Supabase:
- Importe o arquivo `supabase/schema.sql`
- Configure as políticas RLS com `supabase-rls-policies.sql`

### 5. Execute o projeto
```bash
npm run dev
```

## 🚀 Deploy em Produção

### Vercel
1. Fork este repositório
2. Conecte ao Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

### Netlify
1. Connect to Git
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configure environment variables

## 🔐 Segurança e Conformidade

- ✅ Autenticação segura com Supabase
- ✅ Row Level Security (RLS) ativado
- ✅ Criptografia de dados sensíveis
- ✅ Conformidade com LGPD
- ✅ Headers de segurança configurados
- ✅ Assinaturas digitais para documentos

## 👨‍⚕️ Perfis de Usuário

### 🔴 **Administrador**
- Acesso completo ao sistema
- Gestão de usuários e permissões
- Relatórios financeiros

### 🟡 **Fisioterapeuta**
- Gestão de pacientes
- Prescrição de exercícios
- Criação de registros SOAP

### 🟢 **Estagiário**
- Acompanhamento de pacientes
- Visualização de protocolos

### 🔵 **Paciente**
- Acesso aos próprios dados
- Visualização de exercícios prescritos
- Histórico de consultas

## 🧪 Testes e Qualidade

```bash
# Lint
npm run lint

# Build de produção
npm run build

# Preview da build
npm run preview
```

## 📈 Roadmap

### Próximas Funcionalidades
- [ ] App Mobile (React Native)
- [ ] Sistema de Notificações Push
- [ ] Integração com WhatsApp
- [ ] Relatórios PDF automáticos
- [ ] Dashboard Financeiro
- [ ] Sistema de Backup Automático

### Melhorias Planejadas
- [ ] Inteligência Artificial para sugestões de exercícios
- [ ] Integração com equipamentos IoT
- [ ] Telemedicina integrada
- [ ] API pública para terceiros

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👏 Créditos

Desenvolvido com ❤️ para modernizar a fisioterapia brasileira.

---

**FisioFlow** - Transformando o cuidado em saúde através da tecnologia.
