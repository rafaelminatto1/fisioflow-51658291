# Nova Funcionalidade: Iniciar Atendimento

## O que foi adicionado

Adicionado botão "Iniciar Atendimento" na tela de edição de agendamento que leva diretamente para a página de evolução do paciente.

## Localização

**Arquivo:** `professional-app/app/appointment-form.tsx`

## Funcionalidade

### Botão "Iniciar Atendimento"

- **Aparece quando:**
  - Está editando um agendamento existente (não em criação)
  - Status NÃO é "Concluído"
  - Status NÃO é "Cancelado"

- **Ao clicar:**
  - Navega para a página do paciente
  - Abre diretamente na aba "Evoluções"
  - Passa o ID do agendamento como parâmetro

- **Cor:** Verde (success)
- **Ícone:** play-circle-outline
- **Posição:** Entre "Salvar Alterações" e "Excluir Agendamento"

## Fluxo de Uso

1. **Fisioterapeuta abre um agendamento**
   - Clica em um agendamento na agenda
   - Tela de edição abre

2. **Vê o botão "Iniciar Atendimento"**
   - Botão verde aparece abaixo de "Salvar Alterações"
   - Só aparece se o agendamento não estiver concluído/cancelado

3. **Clica em "Iniciar Atendimento"**
   - App navega para `/patient/{patientId}?tab=evolutions&appointmentId={appointmentId}`
   - Página do paciente abre na aba de evoluções
   - Pode criar nova evolução vinculada ao agendamento

## Código Implementado

```typescript
{/* Start Appointment Button - Only show when editing and not completed */}
{isEditing && status !== 'completed' && status !== 'cancelled' && (
  <Button
    title="Iniciar Atendimento"
    onPress={() => {
      medium(); // Haptic feedback
      // Navigate to evolution page for this patient
      router.push(`/patient/${selectedPatient}?tab=evolutions&appointmentId=${appointmentId}`);
    }}
    variant="secondary"
    style={[styles.startButton, { backgroundColor: colors.success }]}
    leftIcon="play-circle-outline"
  />
)}
```

## Condições de Exibição

| Status | Mostra Botão? |
|--------|---------------|
| Agendado | ✅ Sim |
| Confirmado | ✅ Sim |
| Em Atendimento | ✅ Sim |
| Concluído | ❌ Não |
| Cancelado | ❌ Não |
| Faltou | ✅ Sim |

## Benefícios

1. **Acesso Rápido:** Fisioterapeuta vai direto para criar evolução
2. **Contexto Preservado:** ID do agendamento é passado para vincular
3. **Fluxo Natural:** Segue o fluxo de trabalho real do profissional
4. **UX Melhorada:** Menos cliques para iniciar atendimento

## Próximos Passos (Opcional)

Para melhorar ainda mais a funcionalidade:

1. **Auto-criar evolução:** Ao clicar, já criar uma evolução em branco
2. **Mudar status:** Automaticamente mudar status para "Em Atendimento"
3. **Timer:** Iniciar timer de duração do atendimento
4. **Notificação:** Notificar paciente que atendimento iniciou

## Como Testar

1. **Abra o app**
2. **Vá para Agenda**
3. **Clique em um agendamento**
4. **Verifique:**
   - ✅ Botão "Iniciar Atendimento" aparece (verde)
   - ✅ Está entre "Salvar" e "Excluir"
   - ✅ Tem ícone de play
5. **Clique no botão**
6. **Verifique:**
   - ✅ Navega para página do paciente
   - ✅ Abre na aba "Evoluções"
   - ✅ Pode criar nova evolução

## Arquivo Modificado

- `professional-app/app/appointment-form.tsx` - Adicionado botão e lógica de navegação
