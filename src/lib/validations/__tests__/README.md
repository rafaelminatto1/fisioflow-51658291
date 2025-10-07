# Testes de Validações

## Como rodar os testes

```bash
# Rodar todos os testes
npm test

# Rodar testes com interface visual
npm run test:ui

# Rodar testes com cobertura
npm run test:coverage

# Rodar testes em modo watch
npm test -- --watch
```

## Estrutura

- `evento.test.ts` - Testes para validações de eventos
- `prestador.test.ts` - Testes para validações de prestadores
- Adicionar mais conforme necessário

## Cobertura

Meta: > 70% de cobertura de código

## Comandos úteis

```bash
# Rodar apenas testes de um arquivo específico
npm test evento.test.ts

# Rodar testes relacionados a arquivos alterados
npm test -- --changed

# Gerar relatório de cobertura HTML
npm run test:coverage
# Abra coverage/index.html no navegador
```
