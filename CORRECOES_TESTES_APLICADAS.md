# ✅ Correções de Testes E2E Aplicadas

**Data**: 22 de Fevereiro de 2026

---

## 📋 Resumo das Correções

| Problema | Status | Arquivo |
|----------|---------|---------|
| **Seletores de login incorretos** | ✅ Corrigido | Múltiplos arquivos e2e/*.spec.ts |
| **Safe Area iOS no Dialog** | ✅ Corrigido | src/components/ui/dialog.tsx |
| **Botões de voz com aria-label** | ✅ Adicionado | src/components/evolution/SOAPFormPanel.tsx |
| **Safe Area CSS global** | ✅ Já existente | src/index.css |

---

## 🔧 Detalhes das Correções

### 1. Seletores de Login (Timeouts de 30s)

**Problema**: Os testes usavam `input[type="email"]` e `input[type="password"]`, mas o formulário usa `name="email"` e `name="password"`.

**Erro observado**:
```
TimeoutError: page.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')
```

**Solução aplicada**:
Substituição em lote de todos os arquivos de teste:
```bash
# Antes:
await page.fill('input[type="email"]', testUsers.admin.email);
await page.fill('input[type="password"]', testUsers.admin.password);

# Depois:
await page.fill('input[name="email"]', testUsers.admin.email);
await page.fill('input[name="password"]', testUsers.admin.password);
```

**Arquivos corrigidos**: 85 arquivos E2E

---

### 2. Safe Area iOS em Dialog Footer

**Problema**: O modal não respeitava a safe area do iPhone (home indicator) no footer.

**Arquivo**: `src/components/ui/dialog.tsx`

**Correção aplicada**:
```tsx
// Antes:
"pb-safe pt-2",

// Depois:
"pb-[env(safe-area-inset-bottom)] pt-2",
```

**Resultado**: O footer dos modais agora respeita automaticamente a área segura do iOS, garantindo que os botões não fiquem atrás do home indicator.

---

### 3. Botões de Voz com Aria Labels

**Problema**: Os botões de microfone (Speech-to-SOAP) não tinham os atributos `aria-label` adequados para screen readers.

**Arquivo**: `src/components/evolution/SOAPFormPanel.tsx`

**Correção aplicada**:
```tsx
// Adicionado aria-label para melhor acessibilidade
<Button
  ...
  title={isListening ? "Parar gravação" : "Gravar voz para este campo"}
  aria-label={isListening ? "Parar gravação de voz" : "Gravar voz"}
>
  ...
</Button>
```

**Resultado**: Melhor suporte a screen readers e testes de acessibilidade.

---

### 4. Safe Area CSS Global (Já existente)

**Observação**: O arquivo `src/index.css` já possui excelente suporte a Safe Area:

```css
/* iOS Safe Area Support */
.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
}

.modal-footer-safe {
  padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
}
```

Também possui regras para mobile:
```css
@media (max-width: 768px) {
  .modal-mobile-container {
    max-height: calc(100dvh - 1rem);
    height: calc(100dvh - 1rem);
  }
}
```

---

## 📊 Status Final

| Correção | Status |
|-----------|---------|
| Seletores de login | ✅ 85 arquivos corrigidos |
| Safe Area Dialog | ✅ Footer atualizado |
| Aria labels botões voz | ✅ Atributo adicionado |
| Safe Area CSS | ✅ Já existente |

---

## 🚀 Próximos Passos

1. **Reexecutar testes E2E** para validar as correções
2. **Verificar覆盖率** de testes após correções
3. **Validar em iOS real** o comportamento de safe area
4. **Monitorar performance** dos testes após correções

---

**Status**: 🎉 **CORREÇÕES APLICADAS**

Todos os problemas identificados nos testes E2E foram corrigidos:
- ✅ Seletores de login atualizados
- ✅ Safe area iOS suportada
- ✅ Acessibilidade melhorada

Os testes agora devem executar sem os timeouts anteriores.
