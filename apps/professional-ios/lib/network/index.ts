/**
 * Camada de Segurança de Rede
 *
 * Exporta todos os componentes de segurança de rede e Certificate Pinning.
 */

export {
  // Classes e Tipos
  CertificatePinningManager,
  SECURE_DOMAINS,
  ALLOWED_EXTERNAL_DOMAINS,
  SecurityEvent,
  type SecurityEventLog,
  type PinningConfig,
  type TLSVersion,
  REQUIRED_TLS_VERSION,
  DEFAULT_PINNING_CONFIG,

  // Funções principais
  getCertificatePinningManager,
  initializeCertificatePinning,
  validateFirebaseURL,
  validateFirebaseURLs,

  // Hooks
  useCertificatePinning,
} from './certificatePinning';
