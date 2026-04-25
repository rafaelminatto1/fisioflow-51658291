# TestSprite no FisioFlow

## 📊 Decisão Arquitetural

Após análise detalhada, **decidimos continuar com Playwright** como ferramenta principal de testes E2E por:

### ✅ Motivos da Escolha

1. **Playwright já está funcionando bem** (98.9% dos testes unitários passam)
2. **Infraestrutura completa** - testes, mocks, fixtures já configurados
3. **Melhor ROI (Retorno sobre Investimento)** - tempo investido vs benefício
4. **Independência** - não depende de ferramentas externas ou APIs de terceiros
5. **Comunidade ativa** - ampla documentação e suporte disponível
6. **TestSprite é ferramenta MCP** - projetada para uso via IDE, não CLI standalone

### 🔧 Configuração Atualizada

Apesar de decidirmos usar Playwright, mantivemos a configuração do TestSprite atualizada:

```json
// testsprite.config.json
{
  "server": {
    "url": "http://localhost:5173",
    "startup": {
      "command": "pnpm run dev",
      "readyPattern": "Local:",
      "timeout": 30000
    }
  }
}
```

### 📝 Testes Python do TestSprite

Atualizamos os testes Python para usar a porta correta (5173):

```bash
# Testes Python em testsprite_tests/ já atualizados
# URL: http://localhost:5173 (era 8080)
```

### 🚀 Como Usar TestSprite no Futuro

Se no futuro desejar usar TestSprite:

1. **Via MCP (Recomendado)**
   - MCP já configurado em `mcp.json`
   - Funciona com IDEs que suportam MCP (Cursor, VS Code, Windsurf)
   - Não requer instalação adicional

2. **Para Validação Visual**
   - TestSprite pode complementar Playwright para testes visuais
   - Útil para detectar regressões de UI
   - Testar acessibilidade e performance

3. **Integrado com Playwright**
   - Manter Playwright como ferramenta principal
   - Usar TestSprite para cenários específicos de IA
   - Aproveitar melhor de cada ferramenta

### ✅ Critérios de Uso

**Use Playwright para:**

- ✅ Testes E2E de fluxos de negócio
- ✅ Testes de autenticação
- ✅ Testes de formulários e interações
- ✅ Testes de API
- ✅ Testes de integração

**Use TestSprite para:**

- ⚠️ Testes visuais de regressão (futuro)
- ⚠️ Validação de acessibilidade (futuro)
- ⚠️ Performance testing (futuro)
- ⚠️ Testes gerados por IA (futuro)

### 📊 Status Atual

| Ferramenta     | Status         | Uso Principal                        |
| -------------- | -------------- | ------------------------------------ |
| **Vitest**     | ✅ Ativo       | Testes unitários (98.9% sucesso)     |
| **Playwright** | ✅ Ativo       | Testes E2E e integração              |
| **TestSprite** | 🔄 Configurado | Disponível, mas não ativo no momento |

---

**Última atualização:** Março 2026
**Decisão documentada em:** TEST_REPORT.md
