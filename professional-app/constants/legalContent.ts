/**
 * Legal document content in Portuguese for FisioFlow Professional App
 * Covers Privacy Policy, Terms of Service, and Medical Disclaimers
 * All content complies with LGPD (Brazilian data protection law) and Apple App Store guidelines
 */

import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED } from './legalVersions';

/**
 * Privacy Policy content in Portuguese
 * Covers PHI data collection, LGPD rights, third-party sharing, and retention policies
 */
export const PRIVACY_POLICY_CONTENT = `
# Política de Privacidade - FisioFlow Professional

**Última atualização**: ${LEGAL_LAST_UPDATED.PRIVACY_POLICY}
**Versão**: ${LEGAL_VERSIONS.PRIVACY_POLICY}

## 1. Introdução

O FisioFlow Professional é uma ferramenta de gerenciamento clínico desenvolvida para profissionais de fisioterapia no Brasil. Este aplicativo coleta e processa informações de saúde protegidas (PHI - Protected Health Information), incluindo registros SOAP, fotos de pacientes, histórico médico e prescrições de exercícios.

Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados e os dados dos seus pacientes, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e as diretrizes da Apple App Store.

Ao usar o FisioFlow Professional, você concorda com as práticas descritas nesta política.

## 2. Dados Coletados

### 2.1 Dados Pessoais do Profissional
- Nome completo
- Email profissional
- Telefone de contato
- CPF (opcional, para emissão de notas fiscais)
- Número de registro profissional (CREFITO)
- Informações da clínica (nome, endereço, CNPJ)

### 2.2 Dados de Saúde dos Pacientes (PHI)
- Registros SOAP (Subjetivo, Objetivo, Avaliação, Plano)
- Fotos de progresso dos pacientes
- Histórico médico e anamnese
- Prescrições de exercícios e protocolos de tratamento
- Avaliações físicas e funcionais
- Sinais vitais e medições corporais
- Documentos médicos anexados

### 2.3 Dados de Uso do Aplicativo
- Interações com recursos do aplicativo
- Frequência de uso de funcionalidades
- Tempo de sessão
- Preferências de configuração

### 2.4 Dados Técnicos
- Modelo do dispositivo
- Versão do sistema operacional (iOS)
- Versão do aplicativo
- Endereço IP (quando disponível)
- Logs de erros e falhas (sem incluir PHI)
- Dados de localização (apenas quando você usa recursos de check-in na clínica)

## 3. Como Usamos Seus Dados

### 3.1 Finalidades do Tratamento
Usamos seus dados para:
- Fornecer funcionalidades de gerenciamento clínico
- Armazenar e sincronizar registros de pacientes
- Gerar relatórios e análises de progresso
- Enviar notificações sobre consultas e atualizações
- Melhorar a experiência do usuário e corrigir problemas
- Garantir a segurança e prevenir fraudes
- Cumprir obrigações legais e regulatórias

### 3.2 Base Legal (LGPD)
O tratamento de dados é baseado em:
- Execução de contrato (Art. 7º, V da LGPD)
- Cumprimento de obrigação legal (Art. 7º, II da LGPD)
- Legítimo interesse (Art. 7º, IX da LGPD)
- Consentimento explícito para dados sensíveis de saúde (Art. 11, I da LGPD)

## 4. Compartilhamento de Dados

### 4.1 Firebase (Google Cloud Platform)
Compartilhamos dados com o Firebase para:
- **Firestore**: Armazenamento de registros clínicos
- **Firebase Authentication**: Gerenciamento de login e autenticação
- **Firebase Storage**: Armazenamento de fotos e documentos
- **Firebase Cloud Functions**: Processamento de dados e notificações

**Localização dos dados**: Servidores na região southamerica-east1 (São Paulo, Brasil)
**Certificações**: ISO 27001, SOC 2, HIPAA-compliant infrastructure

### 4.2 Expo (Notificações Push)
Usamos o serviço Expo para enviar notificações push sobre:
- Lembretes de consultas
- Atualizações de pacientes
- Alertas do sistema

**Dados compartilhados**: Token do dispositivo, preferências de notificação (sem PHI)

### 4.3 Não Compartilhamos com Terceiros
- Nunca vendemos seus dados ou dados de pacientes
- Nunca compartilhamos PHI com serviços de análise ou marketing
- Nunca usamos dados de saúde para publicidade

## 5. Segurança dos Dados

### 5.1 Criptografia
- **Em repouso**: Todos os dados PHI são criptografados com AES-256-GCM
- **Em trânsito**: Todas as comunicações usam TLS 1.3 ou superior
- **Ponta a ponta**: Registros SOAP são criptografados de ponta a ponta (E2EE)

### 5.2 Autenticação e Controle de Acesso
- Autenticação biométrica obrigatória (Face ID ou Touch ID)
- Fallback com PIN de 6 dígitos mínimo
- Logout automático após 15 minutos de inatividade
- Bloqueio após 5 tentativas de login falhadas

### 5.3 Logs de Auditoria
- Todos os acessos a dados PHI são registrados
- Logs imutáveis (somente adição, sem modificação ou exclusão)
- Retenção mínima de 1 ano para conformidade
- Você pode visualizar seu próprio log de auditoria

### 5.4 Proteção Adicional
- Certificado pinning para conexões Firebase
- Detecção de dispositivos com jailbreak
- Limpeza automática de cache ao fazer logout
- Prevenção de capturas de tela em telas com PHI

## 6. Seus Direitos sob a LGPD

Você tem os seguintes direitos garantidos pela LGPD:

### 6.1 Acesso aos Dados (Art. 18, I e II)
Você pode solicitar acesso a todos os seus dados e dados de pacientes que gerencia.

### 6.2 Correção de Dados (Art. 18, III)
Você pode corrigir dados incompletos, inexatos ou desatualizados diretamente no aplicativo.

### 6.3 Exclusão de Dados (Art. 18, VI)
Você pode solicitar a exclusão de sua conta e todos os dados associados:
- Período de carência de 30 dias antes da exclusão permanente
- Possibilidade de cancelar a solicitação durante o período de carência
- Logs de auditoria são anonimizados e retidos por 1 ano (obrigação legal)

### 6.4 Portabilidade de Dados (Art. 18, V)
Você pode exportar todos os seus dados em formato JSON ou PDF:
- Inclui todos os registros de pacientes, SOAP notes, fotos e protocolos
- Arquivo criptografado com senha fornecida por você
- Disponível para download por 7 dias
- Processamento em até 48 horas para grandes volumes

### 6.5 Revogação de Consentimento (Art. 18, IX)
Você pode revogar consentimentos opcionais a qualquer momento:
- Análise de uso do aplicativo
- Relatórios de falhas
- Comunicações de marketing

### 6.6 Oposição ao Tratamento (Art. 18, § 2º)
Você pode se opor ao tratamento de dados baseado em legítimo interesse.

### 6.7 Informação sobre Compartilhamento (Art. 18, VII)
Você pode solicitar informações sobre entidades com as quais compartilhamos dados.

## 7. Retenção de Dados

### 7.1 Períodos de Retenção
- **Dados de pacientes**: Retidos enquanto sua conta estiver ativa + 5 anos após exclusão (obrigação legal do CFM)
- **Registros SOAP**: 20 anos após o último atendimento (Resolução CFM nº 1.821/2007)
- **Logs de auditoria**: Mínimo de 1 ano, anonimizados após exclusão da conta
- **Dados de uso**: 2 anos para análise e melhoria do serviço
- **Backups**: 90 dias, depois permanentemente excluídos

### 7.2 Exclusão Automática
- Cache local é limpo automaticamente ao fazer logout
- Dados temporários são excluídos após 24 horas
- Sessões expiradas são removidas após 30 dias

## 8. Transferência Internacional de Dados

Os dados são armazenados primariamente em servidores no Brasil (região southamerica-east1 do Google Cloud). Em casos específicos, pode haver transferência para:
- Estados Unidos (infraestrutura do Firebase/Google)
- Mecanismos de proteção: Cláusulas contratuais padrão, certificações ISO 27001 e SOC 2

## 9. Cookies e Tecnologias Similares

O aplicativo móvel não usa cookies. Usamos:
- **AsyncStorage**: Armazenamento local de preferências (não sensível)
- **SecureStore**: Armazenamento seguro de tokens de autenticação (iOS Keychain)
- **Tokens de sessão**: Para manter você autenticado

## 10. Menores de Idade

O FisioFlow Professional é destinado exclusivamente a profissionais de saúde maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade como usuários do aplicativo.

Nota: Pacientes menores de idade podem ter seus dados de saúde gerenciados por profissionais, com consentimento dos responsáveis legais conforme exigido pela legislação.

## 11. Alterações nesta Política

Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos alterações significativas:
- Você será notificado por email e notificação no aplicativo
- Será solicitada nova aceitação antes de continuar usando o aplicativo
- A versão e data de atualização serão atualizadas no topo deste documento

## 12. Incidentes de Segurança

Em caso de violação de dados que possa representar risco aos seus direitos:
- Notificaremos você em até 72 horas
- Notificaremos a Autoridade Nacional de Proteção de Dados (ANPD)
- Tomaremos medidas imediatas para mitigar o impacto

## 13. Contato e Encarregado de Dados

Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:

**Email**: privacidade@fisioflow.com.br
**Encarregado de Proteção de Dados (DPO)**: dpo@fisioflow.com.br
**Telefone**: +55 11 XXXX-XXXX
**Endereço**: [Endereço da empresa]

Responderemos suas solicitações em até 15 dias úteis.

## 14. Autoridade de Proteção de Dados

Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD):
**Website**: https://www.gov.br/anpd/
**Email**: atendimento@anpd.gov.br

---

**Consentimento**: Ao usar o FisioFlow Professional, você confirma que leu, compreendeu e concorda com esta Política de Privacidade.
`;

/**
 * Terms of Service content in Portuguese
 * Includes medical disclaimer and usage terms
 */
export const TERMS_OF_SERVICE_CONTENT = `
# Termos de Uso - FisioFlow Professional

**Última atualização**: ${LEGAL_LAST_UPDATED.TERMS_OF_SERVICE}
**Versão**: ${LEGAL_VERSIONS.TERMS_OF_SERVICE}

## 1. Aceitação dos Termos

Ao acessar e usar o FisioFlow Professional ("Aplicativo"), você ("Usuário" ou "Profissional") concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concorda com estes termos, não use o Aplicativo.

## 2. Descrição do Serviço

O FisioFlow Professional é uma ferramenta de gerenciamento clínico desenvolvida para profissionais de fisioterapia no Brasil. O Aplicativo oferece:
- Gerenciamento de registros de pacientes
- Sistema de prontuário eletrônico (SOAP)
- Biblioteca de exercícios e prescrições
- Agendamento de consultas
- Análise de progresso e relatórios

## 3. Elegibilidade

Para usar o Aplicativo, você deve:
- Ser maior de 18 anos
- Ser profissional de fisioterapia registrado no CREFITO
- Ter autorização legal para exercer a profissão no Brasil
- Fornecer informações verdadeiras e precisas durante o cadastro

## 4. Conta de Usuário

### 4.1 Criação de Conta
- Você é responsável por manter a confidencialidade de suas credenciais
- Você é responsável por todas as atividades realizadas em sua conta
- Notifique-nos imediatamente sobre qualquer uso não autorizado

### 4.2 Segurança da Conta
- Use senhas fortes (mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais)
- Ative autenticação biométrica (Face ID ou Touch ID)
- Não compartilhe suas credenciais com terceiros
- Faça logout ao usar dispositivos compartilhados

### 4.3 Suspensão e Encerramento
Podemos suspender ou encerrar sua conta se:
- Você violar estes Termos de Uso
- Você fornecer informações falsas
- Você usar o Aplicativo para fins ilegais ou antiéticos
- Houver suspeita de atividade fraudulenta

## 5. Uso Aceitável

### 5.1 Você Concorda em:
- Usar o Aplicativo apenas para fins profissionais legítimos
- Cumprir todas as leis e regulamentos aplicáveis (CFM, COFFITO, LGPD)
- Respeitar os direitos de privacidade dos pacientes
- Manter a confidencialidade das informações de saúde
- Obter consentimento adequado dos pacientes para coleta de dados

### 5.2 Você NÃO Pode:
- Usar o Aplicativo para fins ilegais ou não autorizados
- Tentar acessar dados de outros profissionais ou organizações
- Fazer engenharia reversa, descompilar ou desmontar o Aplicativo
- Transmitir vírus, malware ou código malicioso
- Usar o Aplicativo para spam ou comunicações não solicitadas
- Violar direitos de propriedade intelectual
- Compartilhar ou revender acesso ao Aplicativo

## 6. Responsabilidades do Profissional

### 6.1 Decisões Clínicas
- Você é o único responsável por todas as decisões clínicas e diagnósticos
- O Aplicativo é uma ferramenta de gerenciamento, não um dispositivo médico
- Você deve usar seu julgamento profissional em todos os casos
- O Aplicativo não substitui avaliação clínica presencial

### 6.2 Dados dos Pacientes
- Você é o controlador dos dados dos seus pacientes (LGPD)
- Você deve obter consentimento adequado dos pacientes
- Você deve garantir a precisão dos dados inseridos
- Você é responsável por cumprir obrigações legais de retenção de dados

### 6.3 Conformidade Profissional
- Você deve manter registro profissional ativo no CREFITO
- Você deve cumprir o Código de Ética da Fisioterapia
- Você deve seguir as resoluções do COFFITO
- Você deve manter seguro profissional adequado

## 7. Aviso Médico e Limitações

### 7.1 Não é um Dispositivo Médico
O FisioFlow Professional:
- NÃO é um dispositivo médico regulamentado
- NÃO realiza diagnósticos automáticos
- NÃO fornece recomendações médicas
- NÃO substitui consulta, diagnóstico ou tratamento profissional

### 7.2 Limitações do Aplicativo
- Prescrições de exercícios são criadas por você, não geradas automaticamente
- Você deve verificar a adequação de cada exercício para cada paciente
- Você deve monitorar o progresso e ajustar tratamentos conforme necessário
- O Aplicativo não valida a correção clínica das suas decisões

### 7.3 Uso Sob Sua Responsabilidade
Ao usar este Aplicativo, você reconhece e aceita que:
- Você é totalmente responsável por todas as decisões clínicas
- O Aplicativo é fornecido "como está" para fins de gerenciamento
- Você não deve confiar exclusivamente no Aplicativo para decisões críticas
- Você deve sempre usar seu julgamento profissional qualificado

## 8. Propriedade Intelectual

### 8.1 Propriedade do FisioFlow
O Aplicativo, incluindo código, design, logotipos, marcas e conteúdo, é propriedade da FisioFlow e protegido por leis de propriedade intelectual.

### 8.2 Licença de Uso
Concedemos a você uma licença limitada, não exclusiva, intransferível e revogável para usar o Aplicativo conforme estes Termos.

### 8.3 Seus Dados
Você mantém todos os direitos sobre os dados que insere no Aplicativo. Concedemos a nós uma licença para processar esses dados conforme necessário para fornecer o serviço.

## 9. Privacidade e Proteção de Dados

O tratamento de dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante destes Termos. Ao usar o Aplicativo, você também concorda com a Política de Privacidade.

## 10. Pagamento e Assinatura

### 10.1 Modelo de Negócio
O FisioFlow Professional opera em modelo B2B (Business-to-Business):
- Assinaturas são contratadas através do nosso website
- Pagamentos são processados externamente (não via App Store)
- Não há compras dentro do aplicativo (In-App Purchases)

### 10.2 Planos e Preços
- Planos e preços estão disponíveis em nosso website
- Preços podem ser alterados com aviso prévio de 30 dias
- Assinaturas são renovadas automaticamente, salvo cancelamento

### 10.3 Cancelamento
- Você pode cancelar sua assinatura a qualquer momento
- Cancelamentos têm efeito no final do período de cobrança atual
- Não há reembolsos proporcionais para cancelamentos antecipados

## 11. Disponibilidade e Manutenção

### 11.1 Disponibilidade do Serviço
- Nos esforçamos para manter o Aplicativo disponível 24/7
- Não garantimos disponibilidade ininterrupta
- Pode haver manutenções programadas com aviso prévio

### 11.2 Suporte Técnico
- Suporte está disponível por email: suporte@fisioflow.com.br
- Tempo de resposta: até 48 horas em dias úteis
- Suporte prioritário pode estar disponível em planos premium

## 12. Limitação de Responsabilidade

### 12.1 Isenção de Garantias
O Aplicativo é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.

### 12.2 Limitação de Danos
Na máxima extensão permitida por lei, não seremos responsáveis por:
- Danos indiretos, incidentais, especiais ou consequenciais
- Perda de lucros, receitas ou dados
- Interrupção de negócios
- Decisões clínicas tomadas com base no uso do Aplicativo

### 12.3 Valor Máximo
Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses.

## 13. Indenização

Você concorda em indenizar e isentar a FisioFlow, seus diretores, funcionários e parceiros de quaisquer reclamações, danos, perdas ou despesas (incluindo honorários advocatícios) decorrentes de:
- Seu uso do Aplicativo
- Violação destes Termos
- Violação de direitos de terceiros
- Suas decisões clínicas e tratamentos

## 14. Modificações dos Termos

### 14.1 Direito de Modificação
Reservamos o direito de modificar estes Termos a qualquer momento.

### 14.2 Notificação
Notificaremos você sobre alterações significativas por:
- Email para o endereço cadastrado
- Notificação no Aplicativo
- Aviso na tela de login

### 14.3 Aceitação de Alterações
O uso continuado do Aplicativo após alterações constitui aceitação dos novos Termos. Se você não concordar, deve parar de usar o Aplicativo.

## 15. Lei Aplicável e Jurisdição

### 15.1 Lei Brasileira
Estes Termos são regidos pelas leis da República Federativa do Brasil.

### 15.2 Foro
Fica eleito o foro da comarca de [Cidade], [Estado], Brasil, para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

## 16. Disposições Gerais

### 16.1 Acordo Integral
Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre você e a FisioFlow.

### 16.2 Divisibilidade
Se qualquer disposição destes Termos for considerada inválida, as demais disposições permanecerão em pleno vigor.

### 16.3 Renúncia
A falha em exercer qualquer direito não constitui renúncia a esse direito.

### 16.4 Cessão
Você não pode ceder ou transferir seus direitos sob estes Termos sem nosso consentimento prévio por escrito.

## 17. Contato

Para questões sobre estes Termos de Uso:

**Email**: legal@fisioflow.com.br
**Suporte**: suporte@fisioflow.com.br
**Telefone**: +55 11 XXXX-XXXX
**Endereço**: [Endereço da empresa]

---

**Ao usar o FisioFlow Professional, você confirma que leu, compreendeu e concorda com estes Termos de Uso e com o Aviso Médico aqui contido.**
`;

/**
 * Medical Disclaimer content in Portuguese
 * Context-specific disclaimers for different use cases
 */
export const MEDICAL_DISCLAIMER_CONTENT = {
  /**
   * Medical disclaimer for first app launch
   * Shown during onboarding before accessing main functionality
   */
  'first-launch': `
# Aviso Médico Importante

## O FisioFlow Professional é uma Ferramenta de Gerenciamento Clínico

Este aplicativo foi desenvolvido para auxiliar profissionais de fisioterapia no gerenciamento de suas práticas clínicas. É importante que você compreenda as seguintes limitações e responsabilidades:

### Este Aplicativo NÃO É:
- ❌ Um dispositivo médico regulamentado
- ❌ Um sistema de diagnóstico automático
- ❌ Um gerador de recomendações médicas
- ❌ Um substituto para consulta, avaliação ou tratamento profissional

### Este Aplicativo É:
- ✅ Uma ferramenta de organização e gerenciamento clínico
- ✅ Um sistema de registro de prontuários eletrônicos
- ✅ Uma biblioteca de exercícios para referência profissional
- ✅ Um assistente para acompanhamento de progresso de pacientes

## Suas Responsabilidades como Profissional

### 1. Decisões Clínicas
Você é o único e exclusivo responsável por:
- Todos os diagnósticos realizados
- Todas as avaliações clínicas
- Todos os planos de tratamento prescritos
- Todas as decisões terapêuticas
- Todo o acompanhamento e ajustes de tratamento

### 2. Adequação dos Exercícios
Ao prescrever exercícios através deste aplicativo:
- Você deve avaliar a adequação de cada exercício para cada paciente específico
- Você deve considerar contraindicações, limitações e condições de saúde
- Você deve monitorar a execução e progressão dos exercícios
- Você deve ajustar prescrições conforme a resposta do paciente

### 3. Verificação de Informações
- Você deve verificar a precisão de todas as informações inseridas
- Você deve validar dados antes de tomar decisões clínicas
- Você não deve confiar exclusivamente no aplicativo para informações críticas

### 4. Conformidade Profissional
- Você deve manter seu registro profissional ativo no CREFITO
- Você deve seguir o Código de Ética da Fisioterapia
- Você deve cumprir todas as resoluções do COFFITO
- Você deve obter consentimento adequado dos pacientes

## Limitações Técnicas

### O Aplicativo Não Valida:
- A correção clínica das suas decisões
- A adequação de exercícios para condições específicas
- A segurança de protocolos de tratamento
- A conformidade com diretrizes clínicas

### Você Deve Sempre:
- Usar seu julgamento profissional qualificado
- Consultar literatura científica atualizada
- Considerar as particularidades de cada paciente
- Buscar segunda opinião quando necessário

## Consentimento do Paciente

Você é responsável por:
- Obter consentimento informado dos pacientes para tratamentos
- Explicar riscos e benefícios dos procedimentos
- Documentar adequadamente o consentimento
- Respeitar a autonomia e decisões dos pacientes

## Em Caso de Emergência

Este aplicativo não deve ser usado para:
- Situações de emergência médica
- Diagnóstico de condições agudas graves
- Decisões clínicas urgentes

Em emergências, sempre:
- Acione serviços de emergência (SAMU 192)
- Encaminhe para atendimento médico imediato
- Siga protocolos de emergência estabelecidos

## Reconhecimento

Ao prosseguir, você reconhece e concorda que:

✓ Compreendeu que este é um aplicativo de gerenciamento, não um dispositivo médico

✓ Você é totalmente responsável por todas as decisões clínicas e tratamentos

✓ O aplicativo não substitui seu julgamento profissional qualificado

✓ Você usará o aplicativo apenas como ferramenta auxiliar de gerenciamento

✓ Você cumprirá todas as obrigações éticas e legais da profissão

---

**Este aviso é parte integrante dos Termos de Uso do FisioFlow Professional.**
`,

  /**
   * Medical disclaimer for exercise prescription screens
   * Shown when prescribing exercises to patients
   */
  'exercise-prescription': `
# Aviso: Prescrição de Exercícios

## Responsabilidade Profissional

Ao prescrever exercícios através do FisioFlow Professional, você confirma que:

### Avaliação Clínica
✓ Você realizou avaliação clínica completa do paciente

✓ Você considerou o histórico médico, condições de saúde e limitações

✓ Você verificou contraindicações para os exercícios selecionados

### Adequação dos Exercícios
✓ Os exercícios são apropriados para a condição do paciente

✓ A intensidade e volume são adequados ao nível funcional atual

✓ Você forneceu instruções claras sobre execução e progressão

### Monitoramento
✓ Você estabeleceu plano de acompanhamento adequado

✓ Você orientou o paciente sobre sinais de alerta

✓ Você ajustará a prescrição conforme a resposta do paciente

## Limitações do Aplicativo

⚠️ O aplicativo fornece uma biblioteca de exercícios para referência

⚠️ O aplicativo NÃO valida a adequação dos exercícios para cada paciente

⚠️ O aplicativo NÃO substitui sua avaliação e julgamento profissional

⚠️ Você é responsável por todas as prescrições e suas consequências

## Consentimento do Paciente

Certifique-se de que o paciente:
- Compreendeu os exercícios prescritos
- Foi orientado sobre execução correta
- Conhece os sinais de alerta para interromper
- Consentiu com o plano de tratamento

---

**Ao confirmar, você assume total responsabilidade pela prescrição.**
`,

  /**
   * Medical disclaimer for protocol application screens
   * Shown when applying treatment protocols to patients
   */
  'protocol-application': `
# Aviso: Aplicação de Protocolo de Tratamento

## Responsabilidade na Aplicação de Protocolos

Ao aplicar um protocolo de tratamento através do FisioFlow Professional:

### Individualização do Tratamento
✓ Você avaliou se o protocolo é adequado para este paciente específico

✓ Você considerou as particularidades e necessidades individuais

✓ Você está preparado para adaptar o protocolo conforme necessário

### Validação Clínica
✓ O protocolo é baseado em evidências científicas ou sua experiência clínica

✓ Você verificou que não há contraindicações para este paciente

✓ Você estabeleceu critérios de progressão e alta

### Monitoramento e Ajustes
✓ Você acompanhará a resposta do paciente ao protocolo

✓ Você modificará o protocolo se a resposta não for adequada

✓ Você documentará progressão e resultados

## Importante Lembrar

⚠️ Protocolos são diretrizes gerais, não receitas fixas

⚠️ Cada paciente responde de forma única ao tratamento

⚠️ Você deve usar julgamento clínico para adaptar protocolos

⚠️ Você é responsável pelos resultados do tratamento

## Documentação

Certifique-se de documentar:
- Justificativa para escolha do protocolo
- Adaptações realizadas para o paciente
- Resposta ao tratamento
- Decisões de progressão ou modificação

---

**Ao aplicar este protocolo, você confirma ter realizado avaliação adequada e assume responsabilidade pelo tratamento.**
`,
};

/**
 * Helper function to get medical disclaimer content by context
 */
export function getMedicalDisclaimerContent(
  context: 'first-launch' | 'exercise-prescription' | 'protocol-application'
): string {
  return MEDICAL_DISCLAIMER_CONTENT[context];
}

/**
 * Helper function to check if legal content needs to be updated
 * (e.g., fetched from remote URL)
 */
export function shouldFetchRemoteLegalContent(): boolean {
  // In production, you might want to fetch updated content from a remote URL
  // For now, we use the embedded content
  return false;
}

/**
 * Remote URLs for legal documents (for web viewing and updates)
 */
export const LEGAL_DOCUMENT_URLS = {
  PRIVACY_POLICY: 'https://fisioflow.com.br/privacidade',
  TERMS_OF_SERVICE: 'https://fisioflow.com.br/termos',
  SUPPORT: 'https://fisioflow.com.br/suporte',
  CONTACT: 'mailto:privacidade@fisioflow.com.br',
} as const;
