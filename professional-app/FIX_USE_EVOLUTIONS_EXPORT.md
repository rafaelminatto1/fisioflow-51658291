# Correção: useEvolutions não estava exportado

## Problema

Erro ao abrir página de detalhes do paciente:
```
ERROR [TypeError: useEvolutions is not a function (it is undefined)]
```

## Causa

O hook `useEvolutions` existe em `hooks/useEvolutions.ts` mas não estava sendo exportado no arquivo `hooks/index.ts`.

Quando o código importa:
```typescript
import { useEvolutions } from '@/hooks';
```

O TypeScript/JavaScript procura no arquivo `hooks/index.ts` e não encontrava a exportação.

## Solução

Adicionado a exportação de `useEvolutions` e `useEvolution` no arquivo `hooks/index.ts`:

```typescript
export { useEvolutions, useEvolution } from './useEvolutions';
```

## Arquivo Modificado

- `professional-app/hooks/index.ts` - Adicionada linha de exportação

## Como Testar

1. **Reinicie o Expo:**
   ```bash
   cd professional-app
   npx expo start --clear
   ```

2. **Abra o app**

3. **Vá para Pacientes**

4. **Clique em um paciente**

5. **Verifique:**
   - ✅ Página do paciente abre sem erro
   - ✅ Abas aparecem (Info, Financeiro, Evoluções, Exercícios)
   - ✅ Pode navegar entre as abas
   - ✅ Aba "Evoluções" funciona

## Contexto

O hook `useEvolutions` é usado para:
- Listar evoluções (SOAP notes) de um paciente
- Criar novas evoluções
- Atualizar evoluções existentes
- Deletar evoluções

É essencial para a funcionalidade de prontuário eletrônico do app.

## Hooks Exportados Agora

Após a correção, os seguintes hooks estão disponíveis via `@/hooks`:

- `useColorScheme`, `useColors`
- `useAppointments`
- `usePatients`
- `useBiometricAuth`
- `useCamera`
- `useCheckIn`
- `useHaptics`
- `useSyncStatus`
- `useEvolutions`, `useEvolution` ← **NOVO**
- `useExercisesLibrary`, `useExerciseCreate`, etc.
- `usePartnerships`, `usePartnership`, etc.
- `usePatientFinancialRecords`, etc.

## Impacto

Esta correção permite:
- ✅ Abrir página de detalhes do paciente
- ✅ Ver evoluções do paciente
- ✅ Criar novas evoluções
- ✅ Usar o botão "Iniciar Atendimento" que foi adicionado
