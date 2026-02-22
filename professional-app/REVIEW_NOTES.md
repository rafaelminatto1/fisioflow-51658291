# Notas para Revisão do Aplicativo (App Store Review Notes)

## Visão Geral
O FisioFlow Professional é uma ferramenta de gestão clínica exclusiva para fisioterapeutas licenciados no Brasil. O aplicativo permite a gestão de prontuários, evoluções SOAP, prescrições de exercícios e agenda.

## Tratamento de Dados de Saúde (PHI)
Este aplicativo lida com informações de saúde protegidas (PHI). Implementamos rigorosas medidas de segurança em conformidade com a LGPD (Brasil) e diretrizes internacionais:
- **Criptografia em Repouso**: Todos os dados sensíveis no banco de dados Firestore são criptografados usando AES-256.
- **Criptografia de Ponta a Ponta (E2EE)**: As evoluções SOAP (subjetivo, objetivo, avaliação, plano) são criptografadas no dispositivo antes do envio.
- **Criptografia em Trânsito**: Todas as comunicações usam TLS 1.3.
- **Armazenamento de Chaves**: As chaves de criptografia são armazenadas exclusivamente no iOS Keychain via `expo-secure-store`.

## Autenticação Biométrica
O acesso aos dados de saúde requer obrigatoriamente Face ID ou Touch ID (com fallback de PIN seguro). Isso garante que os dados dos pacientes permaneçam protegidos mesmo que o dispositivo esteja desbloqueado.

## Justificativa de Permissões
- **Câmera**: Usada apenas para capturar fotos de progresso clínico e demonstrações de exercícios.
- **Biblioteca de Fotos**: Usada para anexar exames e laudos pré-existentes.
- **Localização**: Usada opcionalmente para verificar o check-in do profissional na clínica.
- **Face ID**: Usado para proteger o acesso a dados de saúde sensíveis.

## Conta de Teste para Revisores
- **E-mail**: reviewer@fisioflow.com.br
- **Senha**: ReviewTest2026!
- **PIN de Fallback**: 123456

## Guia de Teste
1. Faça login com as credenciais acima.
2. Navegue até a aba "Pacientes" para ver exemplos de prontuários.
3. Observe que ao abrir uma evolução SOAP, o conteúdo é descriptografado localmente.
4. Verifique as configurações de Privacidade e Transparência de Dados em Perfil > Gerenciar Consentimentos.
