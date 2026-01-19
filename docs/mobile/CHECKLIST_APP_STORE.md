# ✅ Checklist App Store - FisioFlow Mobile

## 📋 Visão Geral

Este é um checklist completo para publicar o aplicativo **FisioFlow** na App Store da Apple.

**Data**: 19 de Janeiro de 2026
**Versão**: 1.0.0
**Bundle ID**: com.fisioflow.app

---

## 👤 Conta Apple Developer

### Configuração da Conta

- [ ] **Conta Apple Developer ativa** ($99/ano)
- [ ] **Verificar status da conta**: [App Store Connect](https://appstoreconnect.apple.com)
- [ ] **Dados de pagamento configurados**
- [ ] **Informações legais preenchidas**
  - Nome legal
  - Endereço
  - Contato

### Agreement

- [ ] **Apple Developer Agreement** aceito
- [ ] **Apple Developer Program License** aceito
- [ ] **Dados de impostos preenchidos**

---

## 📱 Configuração do App

### App Store Connect

#### 1. Criar Novo App

- [ ] Login em [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Navegar para "My Apps" > "+"
- [ ] Selecionar "New App"
- [ ] Preencher:
  - [ ] **Platform**: iOS
  - [ ] **Name**: FisioFlow
  - [ ] **Primary Language**: Portuguese (Brazil)
  - [ ] **Bundle ID**: com.fisioflow.app (criar antes)
  - [ ] **SKU**: FISIOFLOW001

#### 2. Bundle ID

- [ ] Criar Bundle ID em "Certificates, Identifiers & Profiles"
  - [ ] Type: Explicit
  - [ ] Bundle ID: com.fisioflow.app
- [ ] Configurar Capabilities:
  - [ ] Push Notifications
  - [ ] In-App Purchase (futuro)
  - [ ] Background Modes (Remote notifications)

---

## 🎨 Assets e Metadados

### 1. App Icon

**Requisitos**:
- Tamanho: 1024x1024 pixels
- Formato: PNG (sem alpha channel)
- Sem bordas arredondadas (iOS adiciona automaticamente)

**Versões necessárias**:
- [ ] Icon_1024x1024.png (principal)

**Ferramentas recomendadas**:
- [AppIcon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)

**Localização**: `ios/App/Assets.xcassets/AppIcon.appiconset/`

- [ ] Icon 1024x1024 gerado
- [ ] Icon adicionado ao Xcode
- [ ] Icon aparece corretamente no simulador

### 2. Screenshots

**Requisitos mínimos**: 3 screenshots por dispositivo

#### iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
- [ ] 1290x2796 pixels (3-10 screenshots)
- [ ] Formato: PNG ou JPEG
- [ ] Sem bordas, frames ou dispositivos

#### iPhone 6.5" (iPhone 14 Plus, 15 Plus)
- [ ] 1242x2688 pixels
- [ ] Formato: PNG ou JPEG

#### iPhone 6.1" (iPhone 14, 15)
- [ ] 1170x2532 pixels
- [ ] Formato: PNG ou JPEG

#### iPhone 5.5" (iPhone SE, 8 Plus)
- [ ] 1242x2208 pixels
- [ ] Formato: PNG ou JPEG

**Screenshots sugeridos**:

1. **Dashboard/Menu Principal**
   - Mostrar visão geral do app
   - Destacar navegação intuitiva

2. **Lista de Pacientes**
   - Mostrar gestão de pacientes
   - Destacar busca e filtros

3. **Agenda/Calendário**
   - Mostrar visualização de agenda
   - Destacar sync com Google Calendar

4. **Exercícios**
   - Mostrar biblioteca de exercícios
   - Destacar vídeos e demonstrações

5. **Prontuário SOAP**
   - Mostrar criação de notas SOAP
   - Destacar organização

6. **Biometria/Face ID**
   - Mostrar autenticação rápida
   - Destacar segurança

7. **Notificações**
   - Mostrar exemplo de notificação
   - Destacar lembretes automáticos

- [ ] Todas as screenshots criadas
- [ ] Screenshots testadas em dispositivos reais
- [ ] Nomes das screenshots: `iPhone_6.7_01.png`, etc.

### 3. App Preview Videos (Opcional)

**Requisitos**:
- Duração: 15-30 segundos
- Formato: .mov (H.264 ou HEVC)
- Resolução: 1080p (1920x1080)
- Taxa de bits: 10 Mbps ou maior

- [ ] App preview gravado (opcional mas recomendado)
- [ ] Upload na App Store Connect

### 4. Descrição do App

#### Nome do App (30 caracteres)
```
FisioFlow - Gestão para Fisioterapia
```

#### Subtítulo (30 caracteres)
```
Clínicas de Fisioterapia
```

#### Descrição Promocional (170 caracteres)
```
Sistema completo para gestão de clínicas de fisioterapia. Agenda, prontuário SOAP, exercícios e muito mais no seu iPhone.
```

#### Descrição (4000 caracteres)

```markdown
FisioFlow é o sistema completo de gestão para clínicas de fisioterapia, agora disponível no seu iPhone.

GESTÃO COMPLETA
• Cadastro e gestão de pacientes com histórico médico completo
• Agenda inteligente com visualizações diária, semanal e mensal
• Sincronização automática com Google Calendar
• Detecção de conflitos de horário

PRONTUÁRIO ELETRÔNICO
• Notas SOAP completas e estruturadas
• Evoluções de pacientes com anexos
• Planos de tratamento personalizados
• Fichas de avaliação padronizadas

EXERCÍCIOS
• Biblioteca com 200+ exercícios categorizados
• Vídeos demonstrativos de alta qualidade
• Prescrição personalizada para cada paciente
• Acompanhamento de progresso em tempo real

FUNCIONALIDADES EXCLUSIVAS IOS
• Autenticação biométrica (Face ID / Touch ID)
• Notificações push nativas para lembretes
• Câmera integrada para fotos e documentos
• Check-in via GPS para comprovação de presença

SEGURANÇA E CONFIDENCIALIDADE
• Criptografia de ponta a ponta
• Conformidade com LGPD
• Auditoria completa de operações
• Backup automático na nuvem

PARA PROFISSIONAIS DE SAÚDE
Desenvolvido especificamente para fisioterapeutas, o FisioFlow simplifica o dia a dia da clínica, permitindo mais tempo para o atendimento ao paciente.

PLANOS
• Use o app gratuitamente com sua conta existente
• Planos para clínicas de todos os tamanhos
• Suporte técnico dedicado

Baixe agora e modernize sua clínica de fisioterapia!

Termos de uso: https://fisioflow.com/termos
Política de privacidade: https://fisioflow.com/privacidade
Suporte: mobile@fisioflow.com
```

- [ ] Descrição preenchida
- [ ] Revisada por especialista (se necessário)
- [ ] Traduzida para inglês (se lançar globalmente)

### 5. Palavras-chave (100 caracteres)

```
fisioterapia, clínica, pacientes, agenda, prontuário, SOAP, exercícios, saúde, terapia, reabilitação
```

- [ ] Palavras-chave definidas

### 6. URL de Suporte

```
https://fisioflow.com/support
```

- [ ] URL configurada
- [ ] Página de suporte funcionando

### 7. URL de Marketing

```
https://fisioflow.com
```

- [ ] Site funcionando
- [ ] Landing page otimizada para mobile

---

## 📄 Documentos Legais

### 1. Política de Privacidade

**Obrigatório** para apps que coletam dados do usuário.

- [ ] Política de privacidade publicada em: `https://fisioflow.com/privacidade`
- [ ] URL adicionada na App Store Connect
- [ ] Inclui:
  - Dados coletados
  - Uso dos dados
  - Compartilhamento de dados
  - Medidas de segurança
  - Direitos do usuário (LGPD)
  - Contato

### 2. Termos de Uso

**Obrigatório** para apps com pagamentos/transações.

- [ ] Termos de uso publicados em: `https://fisioflow.com/termos`
- [ ] URL adicionada na App Store Connect
- [ ] Inclui:
  - Condições de uso
  - Propriedade intelectual
  - Limitação de responsabilidade
  - Política de reembolso

---

## 🏷️ Categorização

### 1. Categoria Principal

- [ ] **Médica** (Medical)
- [ ] Subcategoria: Saúde e Fitness

### 2. Categorias Secundárias (Opcional)

- [ ] Saúde e Fitness
- [ ] Produtividade
- [ ] Negócios

### 3. Content Rights

- [ ] ✅ Não usamos conteúdo de terceiros
- [ ] Ou: ✅ Temos permissão para usar conteúdo de terceiros

---

## 👶 Idade e Classificação

### App Rating

**Para apps médicos**: Geralmente 12+ ou 17+

- [ ] **Classificação sugerida**: 12+
- [ ] **Justificativa**:
  - Conteúdo médico/health
  - Sem violência
  - Sem conteúdo sexual
  - Sem linguagem ofensiva

### Discriminadores de Conteúdo

- [ ] **Violência Realística**: Nenhuma
- [ ] **Violência Fantasiosa**: Nenhuma
- [ ] **Conteúdo Sexual**: Nenhuma
- [ ] **Linguagem Ofensiva**: Nenhuma
- [ ] **Uso de Drogas**: Nenhuma
- [ ] **Conteúdo Adulto**: Nenhuma
- [ ] **Simulação de Jogos de Azar**: Nenhuma
- [ ] **Conteúdo Médico/Crítico**: Sim (tratamentos médicos)
- [ ] **Referência a Alcoólico/Tabaco**: Nenhuma

---

## 🌍 Localização

### Idiomas Suportados

- [ ] **Português (Brasil)** - Principal
- [ ] **Inglês** (Opcional, para expansão)

### Descrições Localizadas

Para cada idioma:

#### Português (Brasil)
- [ ] Nome do App
- [ ] Subtítulo
- [ ] Descrição promocional
- [ ] Descrição
- [ ] Palavras-chave
- [ ] URL de suporte

#### Inglês (se aplicável)
- [ ] Nome do App
- [ ] Subtítulo
- [ ] Descrição promocional
- [ ] Descrição
- [ ] Palavras-chave
- [ ] URL de suporte

---

## 🔐 Configurações do Projeto Xcode

### 1. General

- [ ] **Display Name**: FisioFlow
- [ ] **Bundle Identifier**: com.fisioflow.app
- [ ] **Version**: 1.0.0
- [ ] **Build**: 1
- [ ] **Deployment Target**: iOS 13.0

### 2. Signing & Capabilities

- [ ] **Team**: Sua conta Apple Developer
- [ ] **Signing Certificate**: Automatic (gerenciado pela Xcode)
- [ ] **Capabilities**:
  - [ ] Push Notifications
  - [ ] In-App Purchase (futuro)
  - [ ] Background Modes > Remote notifications

### 3. Info.plist

- [ ] Permissões configuradas:
  - [ ] NSCameraUsageDescription
  - [ ] NSPhotoLibraryUsageDescription
  - [ ] NSPhotoLibraryAddUsageDescription
  - [ ] NSMicrophoneUsageDescription
  - [ ] NSLocationWhenInUseUsageDescription
  - [ ] NSFaceIDUsageDescription
- [ ] Orientação configurada:
  - [ ] iPhone: Portrait only
  - [ ] iPad: All orientations
- [ ] Status Bar configurada

---

## 🧪 Testes

### 1. Testes no Simulador

- [ ] **iPhone SE** (3ª geração)
- [ ] **iPhone 15**
- [ ] **iPhone 15 Pro**
- [ ] **iPhone 15 Pro Max**
- [ ] **iPad Pro** (12.9")

#### Funcionalidades a Testar

#### Autenticação
- [ ] Login com email/senha funciona
- [ ] Logout funciona
- [ ] Refresh token funciona
- [ ] Biometria funciona (se disponível)

#### Pacientes
- [ ] Lista de pacientes carrega
- [ ] Busca funciona
- [ ] Filtros funcionam
- [ ] Criar paciente funciona
- [ ] Editar paciente funciona
- [ ] Visualizar detalhes funciona

#### Agenda
- [ ] Calendário carrega
- [ ] Criar consulta funciona
- [ ] Editar consulta funciona
- [ ] Excluir consulta funciona
- [ ] Visualização mensal/semana/dia funciona
- [ ] Sync com Google Calendar funciona

#### Exercícios
- [ ] Biblioteca carrega
- [ ] Busca funciona
- [ ] Filtros funcionam
- [ ] Prescrever exercício funciona
- [ ] Vídeo reproduz

#### Features Mobile
- [ ] Biometria funciona
- [ ] Push notifications recebidas
- [ ] Câmera abre e captura foto
- [ ] GPS funciona (check-in)

### 2. Testes em Dispositivo Real

- [ ] Testado em **iPhone físico**
- [ ] Push notifications recebidas com app fechado
- [ ] Biometria funciona
- [ ] Performance satisfatória
- [ ] Não há crashes
- [ ] Não há memory leaks

### 3. Testes de Conformidade

#### Apple Guidelines
- [ ] [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) lidos
- [ ] [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) seguidos
- [ ] App funciona conforme descrito
- [ ] Não há features ocultas ou não documentadas

#### LGPD
- [ ] Consentimento obtido antes de coletar dados
- [ ] Usuário pode solicitar exclusão de dados
- [ ] Usuário pode acessar seus dados
- [ ] Política de privacidade clara e acessível

---

## 📦 Build e Archive

### 1. Build de Produção

```bash
# No terminal
npm run build:prod
npm run cap:sync
```

- [ ] Build completo sem erros
- [ ] Todos os assets incluídos
- [ ] PWA service worker gerado
- [ ] Bundle size otimizado

### 2. Abrir no Xcode

```bash
npm run cap:open:ios
```

- [ ] Xcode abre com projeto
- [ ] Sem warnings críticos
- [ ] Certificados configurados

### 3. Archive

1. No Xcode:
   - [ ] Selecionar scheme "Any iOS Device"
   - [ ] Product > Archive
   - [ ] Aguardar build (~5-10 minutos)
   - [ ] Organizer abre automaticamente

2. No Organizer:
   - [ ] Validar Archive (sem erros)
   - [ ] "Distribute App"

### 4. Distribute

1. Selecionar **"App Store Connect"**
2. Selecionar **"Automatically manage signing"**
3. Upload:
   - [ ] Upload começa
   - [ ] Upload completa sem erros
   - [ ] App aparece no App Store Connect

---

## 🚀 App Store Connect - Submissão

### 1. Preparar para Submissão

- [ ] Todas informações preenchidas
- [ ] Todas as screenshots上传
- [ ] App preview上传 (se aplicável)
- [ ] URL de suporte funcionando
- [ ] Política de privacidade publicada

### 2. Submeter para Review

- [ ] "Add for Review"
- [ ] Selecionar versão (1.0.0)
- [ ] **Expedited Review** (se necessário): https://developer.apple.com/appstore/contact/expedite/
- [ ] Preencher informações de contato:
  - [ ] Nome
  - [ ] Email
  - [ ] Telefone

### 3. Notas para Review

```
O FisioFlow é um sistema de gestão para clínicas de fisioterapia. O app permite que profissionais de saúde gerenciem pacientes, agenda, prontuários e exercícios.

O app requer login de usuário existente (não há cadastro no app). Todos os dados são criptografados e armazenados em conformidade com LGPD.

Não há anúncios. O app é destinado exclusivamente para profissionais de fisioterapia.

Contas de teste podem ser fornecidas mediante solicitação.
```

---

## ⏳ Pós-Submissão

### 1. Status de Review

- [ ] **Waiting for Review** - Aguardando fila
- [ ] **In Review** - Sendo analisado (1-3 dias)
- [ ] **Pending Developer Release** - Aprovado, aguardando release
- [ ] **Ready for Sale** - Disponível na App Store
- [ ] **Rejected** - Rejeitado (corrigir e resubmeter)

### 2. Tipos de Rejeição Comum

#### Issues Técnicos
- App crasha
- Links não funcionam
- Performance ruim
- Não funciona em todos os dispositivos suportados

#### Issues de Conteúdo
- Descrição enganosa
- Metadata incompleta
- Screenshots não representativas
- Informações de contato ausentes

#### Issues Legais
- Política de privacidade ausente
- Termos de uso ausentes
- Uso indevido de dados

### 3. Resposta a Rejeição

Se rejeitado:
- [ ] Ler carefully o feedback da Apple
- [ ] Corrigir todos os issues mencionados
- [ ] Testar novamente
- [ ] Resubmeter com notas explicando correções

---

## 📊 Checklist Final

### Pré-Submissão

- [ ] Conta Apple Developer ativa
- [ ] Bundle ID criado e configurado
- [ ] App criado no App Store Connect
- [ ] Todos os metadados preenchidos
- [ ] Screenshots criadas e上传
- [ ] Política de privacidade publicada
- [ ] Termos de uso publicados
- [ ] URLs funcionando
- [ ] Certificados configurados
- [ ] Info.plist completo
- [ ] Permissões descritas

### Testes

- [ ] Testado no simulador (múltiplos dispositivos)
- [ ] Testado em dispositivo real
- [ ] Todas as features funcionando
- [ ] Não há crashes
- [ ] Performance satisfatória
- [ ] Push notifications funcionando
- [ ] Biometria funcionando
- [ ] Câmera funcionando
- [ ] GPS funcionando

### Conformidade

- [ ] App Store Review Guidelines seguidas
- [ ] Human Interface Guidelines seguidas
- [ ] LGPD compliance
- [ ] Sem violação de direitos autorais
- [ ] Sem código malicioso
- [ ] Sem APIs privadas

### Build e Upload

- [ ] Build de produção completo
- [ ] Archive criado sem erros
- [ ] Upload completo
- [ ] App visível no App Store Connect
- [ ] Submissão iniciada

---

## 📞 Suporte Apple

### Recursos

- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Developer Forums](https://developer.apple.com/forums/)
- [Contact Us](https://developer.apple.com/contact/)

### Em caso de dúvida

1. Consulte a documentação oficial
2. Busque nos fóruns
3. Abra ticket no suporte

---

**Checklist criado em**: 19 de Janeiro de 2026
**Versão**: 1.0
**Próxima revisão**: Após primeira submissão
