# Troubleshooting do Vite

Documentação para resolver problemas comuns do Vite no projeto FisioFlow.

## Erro "504 (Outdated Optimize Dep)"

### Descrição

O erro `504 (Outdated Optimize Dep)` ocorre quando o Vite detecta que as pré-dependências otimizadas estão desatualizadas, impedindo o carregamento de módulos dinâmicos. Este é um problema crítico que pode afetar a navegação após o login.

### Sintomas

- Erro no console: `Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)`
- Páginas não carregam após login
- Módulos dinâmicos falham ao carregar

---

## Soluções Rápidas

### Solução 1: Limpeza Automática (Recomendado)

O script `predev` verifica automaticamente o cache antes de iniciar:

```bash
pnpm run dev
```

O script vai:
- ✅ Verificar a validade do cache (idade < 24h)
- ✅ Verificar se `package.json` foi modificado
- ✅ Limpar o cache automaticamente se necessário

### Solução 2: Limpeza Manual Completa

```bash
pnpm run dev:clean
```

Este comando limpa todos os caches e inicia o servidor.

### Solução 3: Forçar Re-otimização

```bash
pnpm run dev:force
```

Força o Vite a re-otimizar todas as dependências.

### Solução 4: Limpeza Completa do Projeto

```bash
pnpm run clean:all
pnpm run dev
```

Remove `node_modules`, caches e reinstala dependências.

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm run dev` | Inicia com verificação automática de cache |
| `pnpm run dev:clean` | Limpa cache e inicia servidor |
| `pnpm run dev:force` | Força re-otimização de dependências |
| `pnpm run clean:vite` | Limpa apenas caches do Vite |
| `pnpm run clean:all` | Limpa tudo (node_modules + caches) |

---

## Prevenção

### Quando Limpar o Cache

Execute `pnpm run clean:vite` após:

- ✅ Alterar `package.json` (adicionar/remover dependências)
- ✅ Atualizar versões de dependências
- ✅ Modificar `vite.config.ts`
- ✅ Alterar estrutura de imports lazy-loaded

### O Script `predev`

O script `predev` roda automaticamente antes do `dev` e:

1. Verifica se o cache tem menos de 24 horas
2. Verifica se `package.json` foi modificado
3. Limpa o cache se necessário

Na maioria dos casos, basta executar `pnpm run dev` normalmente.

---

## Configuração do Vite

### optimizeDeps

O projeto usa uma configuração otimizada para evitar erros 504:

```typescript
optimizeDeps: {
  noDiscovery: true,           // Controle explícito das dependências
  holdUntilCrawlEnd: false,    // Melhora inicialização a frio
  include: [/* dependências críticas */],
  exclude: [/* bibliotecas médicas/visuais complexas */],
}
```

**Por que essa configuração?**

- `noDiscovery: true`: Evita re-otimizações contínuas que causam erro 504
- `holdUntilCrawlEnd: false`: Melhora tempo de inicialização em projetos grandes
- `include`: Lista apenas dependências que beneficiam de pré-bundling
- `exclude`: Bibliotecas médicas/visuais não se beneficiam e podem causar timeouts

### HMR Timeout

Aumentado para 60 segundos para evitar desconexões em projetos grandes:

```typescript
server: {
  hmr: {
    timeout: 60000,
  },
}
```

---

## Tratamento de Erros

### Listener Global de Preload

O componente `ErrorBoundaryWithViteHandler` inclui tratamento automático:

- Detecta erros `vite:preloadError`
- Recarrega a página automaticamente (até 3 tentativas)
- Evita loops infinitos

**Uso:**

```tsx
import { ErrorBoundaryWithViteHandler } from '@/components/error/ErrorBoundary';

function App() {
  return (
    <ErrorBoundaryWithViteHandler>
      {/* Seu app */}
    </ErrorBoundaryWithViteHandler>
  );
}
```

---

## Problemas Conhecidos

### Cornerstone.js e MediaPipe

Bibliotecas médicas e visuais (`@cornerstonejs/*`, `@mediapipe/*`) estão **excluídas** do `optimizeDeps` por design:

- Não se beneficiam de pré-bundling
- Podem causar timeouts durante otimização
- São carregadas sob demanda via `useLazyLibrary` hook

### Bibliotecas Excluídas

- `@cornerstonejs/dicom-image-loader`
- `@cornerstonejs/core`
- `@cornerstonejs/tools`
- `@cornerstonejs/codec-*`
- `@mediapipe/pose`
- `@mediapipe/tasks-vision`
- `konva`
- `react-konva`

---

## Logs e Debug

### Verificar Cache do Vite

```bash
# Ver conteúdo do cache
ls -la node_modules/.vite/

# Ver metadados do cache
cat node_modules/.vite/_metadata.json
```

### Logs do Vite

O Vite loga informações sobre otimização:

```
[vite] Pre-bundling dependencies:
[vite]  → react
[vite]  → react-dom
[vite]  → @supabase/supabase-js
```

Se ver erros aqui, use `pnpm run clean:vite`.

---

## Contato e Suporte

Se os problemas persistirem:

1. **Verifique os logs** do terminal e console do navegador
2. **Tente `clean:all`** para reinstalar tudo do zero
3. **Consulte** [Troubleshooting Oficial do Vite](https://vite.dev/guide/troubleshooting)
4. **Abra uma issue** no repositório do projeto com:
   - Passos para reproduzir
   - Logs completos do terminal
   - Versão do Node (`node -v`)
   - Versão do pnpm (`pnpm -v`)

---

## Referências

- [Vite Dep Optimization Options](https://vite.dev/config/dep-optimization-options)
- [Vite Troubleshooting](https://vite.dev/guide/troubleshooting)
- [Vite Server Options](https://vite.dev/config/server-options)
- [Issue #16628 - Outdated Optimize Dep](https://github.com/vitejs/vite/issues/16628)
- [Issue #8803 - HMR Issues](https://github.com/vitejs/vite/issues/8803)
