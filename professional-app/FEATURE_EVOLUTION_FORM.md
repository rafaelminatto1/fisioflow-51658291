# Feature: Página de Evolução do Paciente (Formulário SOAP)

## Descrição
Criada página dedicada para registro de evolução do paciente com formulário SOAP completo, acessível diretamente ao clicar em "Iniciar Atendimento" no agendamento.

## Problema Resolvido
Anteriormente, ao clicar em "Iniciar Atendimento", o usuário era redirecionado para a página de perfil do paciente. Agora, vai direto para o formulário de evolução, facilitando o registro da sessão.

## Funcionalidades Implementadas

### 1. Página de Formulário de Evolução (`/evolution-form`)
**Arquivo**: `professional-app/app/evolution-form.tsx`

Página dedicada para criar nova evolução com:
- Header com nome do paciente
- Formulário SOAP completo
- Slider de nível de dor
- Botão de salvar com validação

**Parâmetros da URL**:
- `patientId` - ID do paciente (obrigatório)
- `patientName` - Nome do paciente (para exibição)
- `appointmentId` - ID do agendamento (opcional, para vincular evolução à sessão)

### 2. Componente SOAPForm
**Arquivo**: `professional-app/components/evolution/SOAPForm.tsx`

Formulário com os 4 campos do método SOAP:
- **S (Subjetivo)**: Queixas e sintomas relatados pelo paciente
- **O (Objetivo)**: Observações clínicas, testes realizados
- **A (Avaliação)**: Análise e diagnóstico fisioterapêutico
- **P (Plano)**: Condutas e orientações para próximas sessões

**Características**:
- Campos de texto multilinha
- Ícones identificadores para cada seção
- Placeholder descritivo
- Estilização consistente com o app

### 3. Componente PainLevelSlider
**Arquivo**: `professional-app/components/evolution/PainLevelSlider.tsx`

Slider para registro do nível de dor (0-10):
- Escala visual de 0 a 10
- Cores dinâmicas baseadas no nível:
  - 0: Cinza (Sem dor)
  - 1-3: Verde (Dor leve)
  - 4-6: Amarelo (Dor moderada)
  - 7-10: Vermelho (Dor intensa)
- Labels descritivos
- Feedback visual imediato

### 4. Integração com "Iniciar Atendimento"
**Arquivo**: `professional-app/app/appointment-form.tsx`

Botão "Iniciar Atendimento" agora navega para:
```
/evolution-form?patientId={id}&patientName={nome}&appointmentId={id}
```

**Antes**: Ia para `/patient/{id}?tab=evolutions`
**Depois**: Vai para `/evolution-form` (página dedicada)

## Fluxo de Uso

1. Fisioterapeuta abre um agendamento
2. Clica em "Iniciar Atendimento"
3. É redirecionado para página de evolução
4. Preenche os campos SOAP
5. Ajusta o nível de dor no slider
6. Clica em "Salvar Evolução"
7. Evolução é registrada e vinculada ao agendamento
8. Retorna para a tela anterior

## Validações

### Validação de Conteúdo
- Pelo menos um campo SOAP deve estar preenchido
- Alerta exibido se tentar salvar sem conteúdo
- Feedback háptico em caso de erro

### Estados de Loading
- Botão desabilitado durante salvamento
- Indicador de loading (ActivityIndicator)
- Feedback háptico de sucesso após salvar

## Estrutura de Dados

### Payload da Evolução
```typescript
{
  patientId: string;
  appointmentId?: string;
  date: Date;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painLevel: number;
  attachments: string[];
}
```

## Dependências Adicionadas

### @react-native-community/slider
```bash
npm install @react-native-community/slider --legacy-peer-deps
```

Usado para o slider de nível de dor com feedback visual.

## Arquivos Criados

1. `professional-app/app/evolution-form.tsx` - Página principal
2. `professional-app/components/evolution/SOAPForm.tsx` - Formulário SOAP
3. `professional-app/components/evolution/PainLevelSlider.tsx` - Slider de dor

## Arquivos Modificados

1. `professional-app/app/appointment-form.tsx` - Atualizado botão "Iniciar Atendimento"

## Melhorias Futuras (Opcional)

### 1. Upload de Fotos
- Adicionar componente para anexar fotos da sessão
- Integração com câmera e galeria
- Upload para Firebase Storage

### 2. Assinatura Digital
- Campo para assinatura do fisioterapeuta
- Validação de autenticidade
- Armazenamento seguro

### 3. Templates de Evolução
- Salvar templates de texto frequentes
- Autocompletar baseado em histórico
- Sugestões inteligentes

### 4. Modo Offline
- Salvar rascunhos localmente
- Sincronizar quando online
- Indicador de status de sincronização

### 5. Histórico de Evoluções
- Visualizar evoluções anteriores do paciente
- Comparar progresso ao longo do tempo
- Gráficos de evolução de dor

## Testes Recomendados

- [ ] Abrir agendamento e clicar em "Iniciar Atendimento"
- [ ] Verificar que abre página de evolução (não perfil do paciente)
- [ ] Preencher campos SOAP
- [ ] Ajustar slider de dor
- [ ] Salvar evolução
- [ ] Verificar que evolução foi salva no Firestore
- [ ] Verificar vinculação com appointmentId
- [ ] Testar validação (tentar salvar sem conteúdo)
- [ ] Testar feedback háptico

## Notas Técnicas

### Integração com useEvolutions Hook
A página usa o hook `useEvolutions` que já estava implementado:
- `createAsync` - Cria nova evolução
- `isCreating` - Estado de loading
- Integração com TanStack Query para cache

### Navegação
Usa `expo-router` para navegação:
- `router.push()` - Navegar para página
- `router.back()` - Voltar após salvar
- Parâmetros via query string

### Estilização
Segue padrão do app:
- Usa `useColors()` para tema
- Componentes reutilizáveis
- Layout responsivo
- Feedback visual consistente

---
**Data**: 2026-02-21
**Status**: ✅ Completo
**Impacto**: Alto - Melhora significativa no fluxo de atendimento
