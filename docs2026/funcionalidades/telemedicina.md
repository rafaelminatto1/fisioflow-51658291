# Funcionalidade: Telemedicina

## Visão Geral

Sistema de telemedicina com videoconferência integrada, sala de espera virtual e gravação de sessões.

## Status Atual

⚠️ **Parcialmente implementado** - Página criada, funcionalidade em desenvolvimento

## Recursos Planejados

- ✅ Página de telemedicina
- ⚠️ Videoconferência WebRTC
- ⚠️ Sala de espera virtual
- ⚠️ Gravação de sessões
- ⚠️ Chat durante consulta
- ⚠️ Compartilhamento de tela
- ⚠️ Anotações sincronizadas

## Páginas

- `/telemedicine` - Dashboard de telemedicina
- `/telemedicine/:id` - Sala de consulta

## Funcionalidades

### Antes da Consulta

- Agendamento de teleconsulta
- Link de acesso para o paciente
- Sala de espera virtual
- Verificação de equipamentos

### Durante a Consulta

- Videoconferência HD
- Chat de texto
- Compartilhamento de tela
- Anotações em tempo real

### Depois da Consulta

- Gravação disponível
- SOAP gerado automaticamente
- Prescrição de exercícios
- Relatório de consulta

## Integrações Possíveis

- **Zoom** - Videoconferência
- **Google Meet** - Videoconferência
- **Whereby** - Videoconferência
- **Twilio Video** - WebRTC

## Roadmap

- [ ] Integração WebRTC completa
- [ ] Gravação de sessões
- [ ] Chat durante consulta
- [ ] Compartilhamento de tela
- [ ] Interface para pacientes

## Veja Também

- [Agenda](./agenda.md) - Agendamento de teleconsultas
- [Prontuário](./prontuario.md) - SOAP pós-consulta
