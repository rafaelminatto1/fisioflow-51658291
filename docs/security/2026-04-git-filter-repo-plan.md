# Plano de `git filter-repo` — Purge de secrets vazados

**Data planejamento:** 2026-04-24
**Status:** Aguardando execução coordenada
**Decisor:** @rafaelminatto1

## Escopo: strings a purgar do histórico

| Categoria                   | Valor                     | Ação já tomada                                 |
| --------------------------- | ------------------------- | ---------------------------------------------- |
| Senha antiga `neondb_owner` | `REDACTED-NEON-PASSWORD`  | Rotacionada em 2026-04-24                      |
| LiveKit API Key antiga      | `REDACTED-LIVEKIT-KEY`    | Revogada/descartada — vamos pra CF RealtimeKit |
| LiveKit API Secret antigo   | `REDACTED-LIVEKIT-SECRET` | Revogado                                       |
| Google AI Key antiga        | `REDACTED-GOOGLE-AI-KEY`  | Rotacionada em 2026-04-24                      |

Novos valores (mantidos):

- Google AI Key nova: `AIzaSyBOZSFzfQQXO_STq0ACNdODL1sY96rRaI0`
- LiveKit key nova (`API5VeauxZHf32D`): **será revogada pelo usuário** (descartando LiveKit)

## Impacto

- **Repo público**: `https://github.com/rafaelminatto1/fisioflow-51658291`
- **3.388 commits** no histórico — todos terão hashes alterados
- **79 branches remotos** — todos precisam ser deletados+recriados ou rebasedaos
- **10+ PRs abertos** (65, 64, 58, 51, 38, 37, 36, 35, 34, 33, ...) — precisam ser fechados e reabertos
- Clones locais de colaboradores ficam inválidos — precisam re-clonar

## Pré-requisitos antes de executar

- [ ] Google AI key antiga **confirmada como revogada** no aistudio.google.com
- [ ] LiveKit key antiga **confirmada como revogada** em cloud.livekit.io
- [ ] Senha antiga Neon — **já invalidada** ✅
- [ ] Backup do repo em tarball externo (caso algo dê errado)
- [ ] Lista de PRs abertos revisada com decisão: quais fechar, quais manter (recriar depois)
- [ ] Comunicação clara para colaboradores (se houver) antes do force-push
- [ ] Janela de manutenção combinada (evitar push concorrente durante a operação)

## Procedimento

### 1. Setup (5 min)

```bash
# Instalar git-filter-repo
pip install git-filter-repo
# Verificar versão
git-filter-repo --version  # >= 2.38
```

### 2. Backup defensivo (5 min)

```bash
cd /home/rafael/Documents/fisioflow
git clone --mirror https://github.com/rafaelminatto1/fisioflow-51658291.git fisioflow-backup-2026-04-24.git
tar czf fisioflow-backup-2026-04-24.tar.gz fisioflow-backup-2026-04-24.git/
# Guarde esse tarball em local seguro antes de prosseguir
```

### 3. Criar replacements file

```bash
cat > /tmp/fisioflow-replacements.txt <<'EOF'
REDACTED-NEON-PASSWORD==>REDACTED-NEON-PASSWORD
REDACTED-LIVEKIT-KEY==>REDACTED-LIVEKIT-KEY
REDACTED-LIVEKIT-SECRET==>REDACTED-LIVEKIT-SECRET
REDACTED-GOOGLE-AI-KEY==>REDACTED-GOOGLE-AI-KEY
EOF
```

### 4. Executar em clone dedicado (10 min)

```bash
# NÃO rodar no checkout principal — fazer em clone isolado
cd /tmp
git clone --no-local /home/rafael/Documents/fisioflow/fisioflow-51658291 fisioflow-rewrite
cd fisioflow-rewrite

# Rewrite history
git filter-repo --replace-text /tmp/fisioflow-replacements.txt --force

# Validar: buscar strings antigas
git log --all -p | grep -F "REDACTED-NEON-PASSWORD" && echo "❌ ainda presente" || echo "✅ purgado"
git log --all -p | grep -F "REDACTED-LIVEKIT-KEY" && echo "❌ ainda presente" || echo "✅ purgado"
git log --all -p | grep -F "REDACTED-LIVEKIT-SECRET" && echo "❌ ainda presente" || echo "✅ purgado"
git log --all -p | grep -F "REDACTED-GOOGLE-AI-KEY" && echo "❌ ainda presente" || echo "✅ purgado"
```

### 5. Force-push coordenado (crítico)

```bash
# Adicionar remote original
cd /tmp/fisioflow-rewrite
git remote add origin https://github.com/rafaelminatto1/fisioflow-51658291.git

# Force-push apenas main primeiro
git push origin main --force-with-lease

# Validar no navegador que está OK antes de seguir
# Se OK: force-push todas as branches
git push origin --force --all
git push origin --force --tags
```

### 6. Limpeza pós-rewrite

```bash
# No checkout local original — fazer reset
cd /home/rafael/Documents/fisioflow/fisioflow-51658291
git fetch origin --prune --tags
git reset --hard origin/main

# GitHub: aciona GC automático após force-push, mas secrets indexados podem permanecer
# em cache GitHub por até 90 dias. Para remoção imediata:
# → gh api -X POST /repos/rafaelminatto1/fisioflow-51658291/dispatches ... não funciona para isso
# → Abrir ticket GitHub Support: https://support.github.com → "Remove cached views"
```

### 7. Post-mortem

- [ ] Revalidar API `/api/health` em produção — deve seguir 200 OK (Hyperdrive usa `app_runtime`, não `neondb_owner`)
- [ ] Verificar deploys Cloudflare recentes não foram afetados (CI usa secrets CF, não git)
- [ ] Notificar colaboradores ativos para re-clone
- [ ] Fechar PRs abertos pré-rewrite; pedir autores para recriar baseados na nova `main`
- [ ] Deletar repositório-backup `fisioflow-backup-2026-04-24.git` após 30 dias de estabilidade

## Decisões de escopo

### O que NÃO vou purgar

- Emails de commit (nomes/emails pessoais são OK em repo público se já estão lá)
- Diffs de features (só os 4 secrets vazados acima)
- `apps/api/.dev.vars` já foi removido do tracking (commit separado da purge)

### PRs abertos — triagem

| #              | Título                              | Decisão                                      |
| -------------- | ----------------------------------- | -------------------------------------------- |
| 65             | docs: cloudflare/neon strategy plan | reabrir                                      |
| 64             | docs: google innovation proposal    | reabrir                                      |
| 58             | palette a11y icon buttons           | fechar (obsoleto)                            |
| 51             | vinext POC                          | fechar (fora de roadmap)                     |
| 38             | v2 evolution editor                 | avaliar — pode já ter sido mergeado conceito |
| 37             | debounce consolidation              | fechar ou rebase manual                      |
| 36, 35, 34, 33 | bolt optimizations                  | fechar (provavelmente obsoletos)             |

## Riscos residuais

1. **GitHub cache**: secrets podem ficar em "Deleted references" do GitHub por até 90 dias. Uso real: secrets já foram rotacionados, então nunca foram válidos.
2. **Forks/mirrors**: qualquer fork público do repo ainda terá histórico antigo. Impossível remover. Mitigação: rotação de secrets já cobre.
3. **Google indexing**: se Google indexou um arquivo com secret, leva semanas pra sair. Mesmo raciocínio.

**Conclusão**: rotação + filter-repo = defesa em profundidade. O valor real de segurança veio da rotação (feita). O filter-repo é higiene.
