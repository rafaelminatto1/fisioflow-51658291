## Tipo de mudança

- [ ] Feature nova
- [ ] Bugfix
- [ ] Migration de banco de dados
- [ ] Refactor / melhoria interna
- [ ] Docs / configuração
- [ ] Segurança / dependências

## Descrição

<!-- O que muda e por quê? Uma ou duas frases. -->

## Issue relacionada

<!-- Closes #NNN ou N/A -->

## Checklist técnico

- [ ] `pnpm lint` passando localmente
- [ ] `pnpm type-check` passando localmente
- [ ] Testes relevantes adicionados ou atualizados
- [ ] Nenhum segredo ou credencial no código

## Checklist de migration (preencher apenas se houver migration de DB)

- [ ] Arquivo segue a convenção `NNNN_descricao.sql`
- [ ] Script `down` (rollback) incluído
- [ ] Testado em staging antes de abrir o PR
- [ ] Impacto de performance avaliado (índices, locks, tamanho da tabela)

## Checklist de segurança (preencher se a mudança afeta auth, dados de pacientes ou RBAC)

- [ ] Acesso verificado por role (Admin / Fisioterapeuta / Estagiário / Paciente)
- [ ] RLS Neon cobre o novo dado sensível (se aplicável)
- [ ] Sem dados de pacientes expostos em logs

## Checklist de design system (preencher se a mudança adiciona ou altera componentes visuais)

- [ ] Usa tokens semânticos Tailwind (sem hex/valores hardcoded — ver `DESIGN_SYSTEM.md` seção 1)
- [ ] Testado em light e dark mode
- [ ] Estados acessíveis verificados: hover, focus, disabled, error
- [ ] Labels e ARIA presentes em todos os inputs e botões icon-only
- [ ] Responsividade testada em mobile (≤ 768px) e desktop
- [ ] Novo componente adicionado ao catálogo em `DESIGN_SYSTEM.md` (seção 7)

## Notas para reviewer

<!-- Contexto adicional, decisões de design, pontos de atenção. -->
