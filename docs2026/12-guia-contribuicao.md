# 12. Guia de Contribuição

## 🤝 Como Contribuir

Contribuições são bem-vindas! Existem muitas formas de contribuir com o FisioFlow:

- Reportando bugs
- Sugerindo novas funcionalidades
- Enviando pull requests
- Melhorando a documentação
- Compartilhando o projeto

## 🐛 Reportando Bugs

Antes de reportar um bug:

1. Verifique se o bug já foi reportado
2. Use a template de issue do GitHub
3. Inclua:
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots se aplicável
   - Ambiente (SO, browser, versão)

### Template de Bug

```markdown
## Descrição
Breve descrião do bug

## Passos para Reproduzir
1. Ir para '...'
2. Clicar em '....'
3. Rolar para '....'
4. Ver erro

## Comportamento Esperado
O que deveria acontecer

## Comportamento Atual
O que acontece de fato

## Screenshots
Se aplicável, adicione screenshots

## Ambiente
- SO: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- Versão: [e.g. 2.0.0]

## Contexto Adicional
Outras informações relevantes
```

## 💡 Sugerindo Funcionalidades

1. Verifique se a funcionalidade já foi sugerida
2. Use a template de feature request
3. Explique o caso de uso
4. Considere se é relevante para a maioria dos usuários

### Template de Feature Request

```markdown
## Descrição da Funcionalidade
Descrição clara e concisa

## Problema que Resolve
Qual problema essa funcionalidade resolve?

## Solução Proposta
Como você imagina a implementação?

## Alternativas
Quais alternativas você considerou?

## Contexto Adicional
Mocks, exemplos, referências
```

## 🔄 Pull Requests

### Processo

1. **Fork** o repositório
2. Crie uma **branch** para sua feature
   ```bash
   git checkout -b feature/minha-funcionalidade
   ```
3. **Commit** suas mudanças
   ```bash
   git commit -m "feat: add minha funcionalidade"
   ```
4. **Push** para a branch
   ```bash
   git push origin feature/minha-funcionalidade
   ```
5. Abra um **Pull Request**

### Padrões de Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[opcional: corpo]

[opcional: footer]
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Bug fix
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto-e-vírgula, etc
- `refactor`: Refatoração
- `perf`: Melhoria de performance
- `test`: Adicionar ou atualizar testes
- `chore`: Atualização de build, configs, etc

**Exemplos:**

```bash
feat(patients): add filter by name
fix(auth): resolve token refresh issue
docs(readme): update installation instructions
refactor(firebase): extract api calls to separate file
```

### Checklist para PR

- [ ] Código segue os padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Commits seguem conventional commits
- [ ] Sem conflitos de merge
- [ ] CI/CD passando (lint, test, build)
- [ ] PR descreve claramente as mudanças

## 📝 Padrões de Código

### TypeScript

```typescript
// ✅ Bom
interface Patient {
  id: string;
  name: string;
  email: string | null;
}

async function getPatient(id: string): Promise<Patient> {
  const snapshot = await getDocs(
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

// ❌ Ruim
async function getPatient(id) {
  return await getDocs(
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
}
```

### React

```tsx
// ✅ Bom
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button
      className={cn('button', variant)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ❌ Ruim
export function Button(props: any) {
  return (
    <button className={props.variant} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
```

### Nomenclatura

```typescript
// Componentes: PascalCase
PatientCard.tsx
AppointmentForm.tsx

// Hooks: camelCase com "use"
usePatients.ts
useAppointments.ts

// Utilitários: camelCase
formatCurrency.ts
calculateAge.ts

// Constantes: UPPER_SNAKE_CASE
const MAX_PATIENTS = 100;
const API_BASE_URL = '...';

// Tipos: PascalCase
interface Patient { }
type PatientStatus = 'active' | 'inactive';
```

## 🧪 Testes

### Adicione testes para:

- Novas funcionalidades
- Bug fixes (para evitar regressão)
- Componentes críticos de UI

### Exemplo

```typescript
describe('PatientCard', () => {
  it('should render patient name', () => {
    render(<PatientCard patient={{ name: 'João' }} />);
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<PatientCard patient={{ name: 'João' }} onClick={onClick} />);
    await user.click(screen.getByText('João'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📖 Documentação

### O que documentar:

- Novas funcionalidades
- Mudanças em APIs
- Novos componentes
- Configurações

### Onde documentar:

- **Código**: Comentários JSDoc para funções complexas
- **Docs**: Atualize docs2026/ se afetar usuários
- **Changelog**: Adicione em CHANGELOG.md

## 🎨 Estilo de Código

### Use Prettier

```bash
# Formatar código
pnpm lint:fix

# Ou configurar VS Code para formatar on save
```

### Regras ESLint

O projeto usa ESLint com regras do React. Verifique:
```bash
pnpm lint
```

## 📋 Code Review

### Como Revisar:

1. **Clareza**: O propósito da mudança está claro?
2. **Implementação**: O código está correto?
3. **Testes**: Testes adequados foram adicionados?
4. **Documentação**: Documentação foi atualizada?
5. **Performance**: Não introduz problemas de performance?
6. **Segurança**: Não introduz vulnerabilidades?

### Comentários Construtivos:

```markdown
// ✅ Bom
"Considerar extrair esta lógica para um hook separado para reutilização"

// ❌ Ruim
"Isso está errado"
```

## 🌟 Reconhecimento

Contribuidores serão listados em:
- `CONTRIBUTORS.md`
- Seção de contributors no README
- Release notes para contribuições significativas

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a **MIT License**.

## 🤔 Dúvidas?

Abra uma issue com a tag `question` ou entre em contato:
- Email: dev@fisioflow.com
- Discord: [Servidor](https://discord.gg/fisioflow)

## 🔗 Recursos Relacionados

- [Código de Conduta](./CODE_OF_CONDUCT.md)
- [Setup de Desenvolvimento](./03-ambiente-desenvolvimento.md)
- [Padrões de Projeto](./02-arquitetura.md)
