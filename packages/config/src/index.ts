/**
 * Configurações compartilhadas do Fisioflow
 *
 * Centraliza configurações de EAS, bundle identifiers e versões
 * para facilitar manutenção e consistência entre apps.
 */

export const APP_CONFIGS = {
  professional: {
    name: 'FisioFlow Profissionais',
    slug: 'fisioflow-professional',
    bundleId: 'com.fisioflow.professional',
    version: '1.0.0',
    easProjectId: '8e006901-c021-464d-bbcd-96d821ab62d0',
  },
  patient: {
    name: 'FisioFlow Paciente',
    slug: 'fisioflow-patient',
    bundleId: 'com.fisioflow.patient',
    version: '1.0.0',
    easProjectId: '3dc7141f-4e97-4c2c-b4aa-959888a0e810',
  },
  web: {
    name: 'Fisioflow',
    slug: 'fisioflow-web',
    bundleId: 'com.rafaelminatto.fisioflow',
    version: '1.0.0',
    easProjectId: '8e006901-c021-464d-bbcd-96d821ab62d0',
  },
} as const;

export type AppConfig = keyof typeof APP_CONFIGS;

/**
 * Obtém configuração do app atual
 * @param appName Nome do app (ex: 'professional', 'patient', 'web')
 */
export function getAppConfig(appName: AppConfig) {
  return APP_CONFIGS[appName];
}

/**
 * Obtém configuração do app atual baseado em environment
 */
export function getCurrentAppConfig() {
  // Em desenvolvimento, usa web config por padrão
  // Em produção, detecta baseado no app atual
  if (process.env.NODE_ENV === 'development') {
    return APP_CONFIGS.web;
  }

  // Detecta qual app está rodando
  // Isso pode ser expandido para detectar automaticamente
  return APP_CONFIGS.professional;
}
