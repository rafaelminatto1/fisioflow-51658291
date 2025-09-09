# Deploy Manual na Vercel - FisioFlow

## 🚀 Guia Passo a Passo para Deploy

### Pré-requisitos
- Conta no GitHub com o repositório FisioFlow
- Conta na Vercel (gratuita)
- Projeto já preparado (Fase 1 concluída)

### Passo 1: Preparar Repositório GitHub

1. **Criar repositório no GitHub**:
   ```bash
   # No terminal do projeto
   git init
   git add .
   git commit -m "Initial commit - FisioFlow ready for production"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/fisioflow.git
   git push -u origin main
   ```

2. **Verificar arquivos essenciais**:
   - ✅ `.gitignore` configurado
   - ✅ `vercel.json` presente
   - ✅ `.env.example` atualizado
   - ✅ `package.json` com scripts corretos

### Passo 2: Deploy na Vercel

1. **Acessar Vercel Dashboard**:
   - Ir para [vercel.com](https://vercel.com)
   - Fazer login com GitHub
   - Clicar em "New Project"

2. **Importar Repositório**:
   - Selecionar o repositório `fisioflow`
   - Clicar em "Import"

3. **Configurar Build Settings**:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Configurar Variáveis de Ambiente**:
   ```
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   VITE_APP_ENV=production
   ```

5. **Deploy**:
   - Clicar em "Deploy"
   - Aguardar build completar (2-5 minutos)

### Passo 3: Verificação Pós-Deploy

1. **Testar Funcionalidades**:
   - [ ] Login/Logout funcionando
   - [ ] Dashboard carregando
   - [ ] CRUD de pacientes
   - [ ] Sistema de agendamentos
   - [ ] Upload de documentos

2. **Verificar Performance**:
   - [ ] Tempo de carregamento < 3s
   - [ ] Lighthouse Score > 90
   - [ ] Sem erros no console

### Passo 4: Configurações Avançadas

1. **Domínio Personalizado** (Opcional):
   - Na Vercel Dashboard > Settings > Domains
   - Adicionar domínio personalizado
   - Configurar DNS conforme instruções

2. **Preview Deployments**:
   - Automático para branches
   - Útil para testar mudanças

### Comandos Úteis

```bash
# Instalar Vercel CLI (opcional)
npm i -g vercel

# Deploy via CLI
vercel --prod

# Ver logs
vercel logs

# Listar deployments
vercel ls
```

### Troubleshooting

**Build Falha**:
- Verificar `package.json` scripts
- Checar dependências
- Validar TypeScript

**Erro de Variáveis**:
- Confirmar todas as env vars
- Verificar prefixo `VITE_`
- Testar conexão Supabase

**Performance Issues**:
- Implementar code splitting
- Otimizar imagens
- Configurar cache headers

---

## 📊 Status Atual

- ✅ Projeto preparado para deploy
- ⏳ Aguardando deploy manual na Vercel
- 🎯 Próximo: Implementar monitoramento

**Estimativa**: 15-30 minutos para deploy completo
**Dificuldade**: Baixa (processo guiado)