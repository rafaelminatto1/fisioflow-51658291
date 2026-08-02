# Implementação — Workspace Clínico Integrado

## Marco 1 — Persistência e contratos

1. Criar migração aditiva `0157_clinical_evidence_workspace.sql` e rollback.
2. Adicionar recursos científicos UUID, associação organizacional, coleções, itens,
   revisões e comparações com índices, constraints e RLS.
3. Criar schemas Zod, normalizadores DOI/PMID e tipos de estado.
4. Implementar listagem paginada, importação de DOI/PMID, coleções, comparação e
   curadoria em rotas autenticadas e org-scoped.
5. Reutilizar PubMed/evidence cache existentes; manter fallback quando schema ainda
   não estiver aplicado.

## Marco 2 — Experiência de biblioteca

1. Criar cliente/hook do workspace com paginação e estados separados.
2. Unificar Artigos com importação por identificador e PDF.
3. Adicionar seleção, comparação e coleções sem duplicar uploads.
4. Integrar consulta FisioBrain com fontes selecionadas e contexto opcional, gated.
5. Exibir proveniência, licença, indexação e curadoria separadamente.

## Marco 3 — UX/UI e acessibilidade

1. Compactar hero em visões internas e corrigir métricas ambíguas.
2. Dar nomes acessíveis à navegação mobile e manter rótulo ativo.
3. Mapear nomes de ícones para componentes, sem strings vazando.
4. Compactar triagem vazia e transformar colunas em layout horizontal/abas mobile.
5. Paginar progressivamente Dashboard, Base Clínica e Dicionário.
6. Reservar safe-area da barra inferior e tornar ações touch/teclado acessíveis.

## Marco 4 — Qualidade

1. Testar normalização, estados, autorização, isolamento e CRUD.
2. Testar paginação, navegação URL e acessibilidade básica.
3. Executar prettier, oxlint, TypeScript, testes Wiki/API e build.
4. Publicar commits exatos sem incluir mudanças não relacionadas.
5. Validar produção autenticada em desktop/mobile, console, rede e screenshots.
