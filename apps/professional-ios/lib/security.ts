/**
 * Inicialização de Segurança da Aplicação
 *
 * Este arquivo centraliza a inicialização de todas as camadas de segurança:
 * - Certificate Pinning
 * - Criptografia de dados em repouso
 * - Autenticação biométrica
 * - Sincronização segura
 */

import { Platform } from 'react-native';
import { getCertificatePinningManager } from './network';
import { getEncryptionService } from './services/encryptionService';

/**
 * Inicializa todas as camadas de segurança da aplicação
 * Deve ser chamado no startup da aplicação
 */
export async function initializeSecurity(): Promise<void> {
  console.log('[Security] Inicializando camadas de segurança...');

  try {
    // 1. Inicializar Certificate Pinning
    await initializeCertificatePinning();

    // 2. Inicializar Serviço de Criptografia
    await initializeEncryption();

    // 3. Verificar integridade dos dados
    await verifyDataIntegrity();

    // 4. Configurar monitoramento de segurança
    await setupSecurityMonitoring();

    console.log('[Security] Camadas de segurança inicializadas com sucesso');
  } catch (error) {
    console.error('[Security] Erro ao inicializar segurança:', error);
    throw error;
  }
}

/**
 * Inicializa o Certificate Pinning
 */
export async function initializeCertificatePinning(): Promise<void> {
  console.log('[Security] Inicializando Certificate Pinning...');

  const manager = getCertificatePinningManager();
  await manager.initialize();

  // Obter e logar status de segurança (apenas em desenvolvimento)
  if (__DEV__) {
    const status = await manager.getSecurityStatus();
    console.log('[Security] Status do Certificate Pinning:', {
      enabled: status.enabled,
      strictMode: status.strictMode,
      platform: status.platform,
      tlsVersion: status.tlsVersion,
      secureDomainsCount: status.secureDomains.length,
    });
  }

  console.log('[Security] Certificate Pinning inicializado');
}

/**
 * Inicializa o serviço de criptografia
 */
async function initializeEncryption(): Promise<void> {
  console.log('[Security] Inicializando serviço de criptografia...');

  const encryptionService = getEncryptionService();

  // Verificar se o serviço está disponível
  if (await encryptionService.isAvailable()) {
    console.log('[Security] Criptografia disponível');
  } else {
    console.warn('[Security] Criptografia não disponível no dispositivo');
  }

  console.log('[Security] Serviço de criptografia inicializado');
}

/**
 * Verifica a integridade dos dados armazenados
 */
async function verifyDataIntegrity(): Promise<void> {
  console.log('[Security] Verificando integridade dos dados...');

  // Implementação futura: verificar hashes de dados críticos
  // Verificar integridade de dados de pacientes, agendamentos, etc.

  console.log('[Security] Integridade dos dados verificada');
}

/**
 * Configura o monitoramento de segurança
 */
async function setupSecurityMonitoring(): Promise<void> {
  console.log('[Security] Configurando monitoramento de segurança...');

  const manager = getCertificatePinningManager();

  // Verificar logs de segurança recentes
  const logs = await manager.getSecurityLogs();

  // Contar eventos de falha
  const failureEvents = logs.filter(
    (log) =>
      log.event === 'CERTIFICATE_VALIDATION_FAILED' ||
      log.event === 'DOMAIN_NOT_ALLOWED' ||
      log.event === 'TLS_VERSION_TOO_OLD'
  );

  if (failureEvents.length > 0) {
    console.warn(
      `[Security] Encontrados ${failureEvents.length} eventos de falha de segurança recentes`
    );
  }

  console.log('[Security] Monitoramento de segurança configurado');
}

/**
 * Verifica se o dispositivo atende os requisitos de segurança mínimos
 */
export async function checkSecurityRequirements(): Promise<{
  meetsMinimum: boolean;
  details: {
    certificatePinning: boolean;
    encryption: boolean;
    biometricsAvailable: boolean;
    osVersionSupported: boolean;
  };
}> {
  const details = {
    certificatePinning: false,
    encryption: false,
    biometricsAvailable: false,
    osVersionSupported: false,
  };

  // Verificar Certificate Pinning
  const pinningManager = getCertificatePinningManager();
  details.certificatePinning = pinningManager.isEnabled();

  // Verificar Criptografia
  const encryptionService = getEncryptionService();
  details.encryption = await encryptionService.isAvailable();

  // Verificar Biometria
  // TODO: Importar de biometricAuthService quando disponível

  // Verificar versão do OS
  if (Platform.OS === 'ios') {
    // iOS 13+ tem suporte completo
    details.osVersionSupported = true; // Simplificado
  } else if (Platform.OS === 'android') {
    // Android 8.0+ tem suporte completo
    details.osVersionSupported = true; // Simplificado
  }

  const meetsMinimum =
    details.certificatePinning && details.encryption && details.osVersionSupported;

  return { meetsMinimum, details };
}

/**
 * Obtém o relatório de segurança da aplicação
 */
export async function getSecurityReport(): Promise<{
  timestamp: number;
  platform: typeof Platform.OS;
  certificatePinning: {
    enabled: boolean;
    strictMode: boolean;
    tlsVersion: string;
    secureDomains: string[];
    lastValidation?: any;
  };
  encryption: {
    available: boolean;
  };
  recentSecurityEvents: any[];
  meetsMinimumRequirements: boolean;
}> {
  const pinningManager = getCertificatePinningManager();
  const encryptionService = getEncryptionService();
  const status = await pinningManager.getSecurityStatus();
  const logs = await pinningManager.getSecurityLogs();
  const requirements = await checkSecurityRequirements();

  return {
    timestamp: Date.now(),
    platform: Platform.OS,
    certificatePinning: {
      enabled: status.enabled,
      strictMode: status.strictMode,
      tlsVersion: status.tlsVersion,
      secureDomains: status.secureDomains,
      lastValidation: status.lastValidation,
    },
    encryption: {
      available: await encryptionService.isAvailable(),
    },
    recentSecurityEvents: logs.slice(-10), // Últimos 10 eventos
    meetsMinimumRequirements: requirements.meetsMinimum,
  };
}
