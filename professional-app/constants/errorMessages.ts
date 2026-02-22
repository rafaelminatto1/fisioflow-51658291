export const ERROR_MESSAGES = {
  // Network
  OFFLINE: 'Você está offline. As alterações serão sincronizadas quando reconectar.',
  NETWORK_ERROR: 'Erro de conexão. Tentando novamente...',
  
  // Authentication
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  SESSION_EXPIRED: 'Sua sessão expirou. Por favor, faça login novamente.',
  BIOMETRIC_FAILED: 'Autenticação biométrica falhou. Use seu PIN.',
  ACCOUNT_LOCKED: 'Conta bloqueada por 15 minutos após múltiplas tentativas.',
  
  // Permissions
  CAMERA_DENIED: 'Acesso à câmera negado. Você pode habilitar nas Configurações.',
  PHOTOS_DENIED: 'Acesso às fotos negado. Você pode habilitar nas Configurações.',
  LOCATION_DENIED: 'Acesso à localização negado. Check-in manual disponível.',
  NOTIFICATIONS_DENIED: 'Notificações desabilitadas. Você receberá alertas no app.',
  
  // Data
  ENCRYPTION_ERROR: 'Erro ao proteger dados. Contate o suporte.',
  EXPORT_FAILED: 'Falha ao exportar dados. Tente novamente.',
  DELETION_FAILED: 'Falha ao processar solicitação de exclusão.',
  
  // Firebase
  PERMISSION_DENIED: 'Você não tem permissão para acessar estes dados.',
  QUOTA_EXCEEDED: 'Limite de armazenamento atingido. Contate o suporte.',
  FUNCTION_TIMEOUT: 'Operação demorou muito. Tente novamente.',
};
