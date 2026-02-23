# Certificate Pinning - FisioFlow Professional

## Visão Geral

Este módulo implementa uma camada de segurança de rede com Certificate Pinning para proteger contra ataques Man-in-the-Middle (MITM) e garantir a integridade das comunicações com os serviços Firebase.

## Arquitetura de Segurança

### iOS
- **App Transport Security (ATS)**: Configurado em `app.json` com:
  - TLS 1.3 obrigatório para domínios Firebase
  - Certificate Transparency habilitado
  - Forward secrecy requerido
  - HTTP inseguro bloqueado

### Android
- **Network Security Config**: Configurado em `android/app/src/main/res/xml/network_security_config.xml` com:
  - `cleartextTrafficPermitted="false"` (bloqueia HTTP)
  - Pinning para domínios Firebase
  - Debug overrides para desenvolvimento

### Camada de Validação JavaScript
- **CertificatePinningManager**: Gerencia validações em runtime
- **Logging de eventos de segurança**: Auditoria de eventos
- **Validação de URLs**: Verificação de domínios permitidos

## Uso Básico

### Inicialização

```typescript
import { initializeCertificatePinning } from '@/lib/network';

// Inicializar no startup da aplicação
await initializeCertificatePinning();
```

### Validação de URLs

```typescript
import { validateFirebaseURL, validateFirebaseURLs } from '@/lib/network';

// Validar uma única URL
const isValid = await validateFirebaseURL('https://firestore.googleapis.com/v1/projects/...');

// Validar múltiplas URLs
const results = await validateFirebaseURLs([
  'https://firestore.googleapis.com/...',
  'https://storage.googleapis.com/...',
]);
```

### Hook React

```typescript
import { useCertificatePinning } from '@/lib/network';

function MyComponent() {
  const { validateURL, getSecurityStatus } = useCertificatePinning();

  const handleURLCheck = async (url: string) => {
    const isValid = await validateURL(url);
    console.log('URL válida:', isValid);
  };

  return <button onPress={() => handleURLCheck('https://...')}>Verificar</button>;
}
```

### Gerenciador Direto

```typescript
import { getCertificatePinningManager } from '@/lib/network';

const manager = getCertificatePinningManager();

// Obter status de segurança
const status = await manager.getSecurityStatus();
console.log('Pinning habilitado:', status.enabled);
console.log('TLS versão:', status.tlsVersion);

// Obter logs de segurança
const logs = await manager.getSecurityLogs();
logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.event} - ${log.domain}`);
});

// Limpar logs
await manager.clearSecurityLogs();
```

## Configuração

### Configuração Padrão

```typescript
export const DEFAULT_PINNING_CONFIG: PinningConfig = {
  enabled: __DEV__ ? false : true,  // Desabilitado em desenvolvimento
  strictMode: false,                 // Ativar após testes completos
  allowedDomains: [...],             // Domínios externos permitidos
  secureDomains: [...],              // Domínios com validação rigorosa
  requiredTLSVersion: 'TLSv1.3',     // TLS mínimo exigido
  enableAuditLogging: true,          // Habilitar logging de segurança
  bypassOnDebug: __DEV__,            // Permitir bypass em desenvolvimento
};
```

### Configuração Personalizada

```typescript
import { getCertificatePinningManager } from '@/lib/network';

const manager = getCertificatePinningManager();

// Atualizar configuração
manager.updateConfig({
  strictMode: true,           // Ativar modo estrito
  enabled: true,              // Garantir habilitado
  bypassOnDebug: false,       // Remover bypass em produção
});

// Habilitar explicitamente
manager.enable();

// Desabilitar (apenas para desenvolvimento)
if (__DEV__) {
  manager.disable();
}
```

## Domínios Configurados

### Domínios Seguros (Firebase)

- `firebasestorage.googleapis.com` - Firebase Storage
- `firestore.googleapis.com` - Firestore Database
- `identitytoolkit.googleapis.com` - Firebase Authentication
- `securetoken.googleapis.com` - Firebase Auth Tokens
- `www.googleapis.com` - Google APIs

### Domínios Externos Permitidos

- `www.youtube.com` - Vídeos de exercícios
- `img.youtube.com` - Thumbnails de vídeos

## Eventos de Segurança

```typescript
export enum SecurityEvent {
  CERTIFICATE_VALID = 'CERTIFICATE_VALID',
  CERTIFICATE_VALIDATION_FAILED = 'CERTIFICATE_VALIDATION_FAILED',
  DOMAIN_NOT_ALLOWED = 'DOMAIN_NOT_ALLOWED',
  TLS_VERSION_TOO_OLD = 'TLS_VERSION_TOO_OLD',
  CERTIFICATE_EXPIRED = 'CERTIFICATE_EXPIRED',
  CERTIFICATE_NOT_YET_VALID = 'CERTIFICATE_NOT_YET_VALID',
  PINNING_BYPASSED = 'PINNING_BYPASSED',
}
```

### Estrutura do Log

```typescript
interface SecurityEventLog {
  event: SecurityEvent;
  domain: string;
  timestamp: number;
  details?: string;
  platform: 'ios' | 'android' | 'web';
}
```

## Testes

### Executar Testes

```bash
pnpm test certificate-pinning
```

### Teste de Validação ATS (iOS)

```bash
pnpm test:ios-ats-validation
```

### Teste de Network Security (Android)

```bash
pnpm test:android-network-security
```

## Monitoramento e Auditoria

### Obter Logs de Segurança

```typescript
const manager = getCertificatePinningManager();
const logs = await manager.getSecurityLogs();

// Filtrar eventos específicos
const failedValidations = logs.filter(
  log => log.event === SecurityEvent.CERTIFICATE_VALIDATION_FAILED
);

// Exportar para análise
console.log(JSON.stringify(logs, null, 2));
```

### Status de Segurança

```typescript
const status = await manager.getSecurityStatus();

console.log({
  enabled: status.enabled,
  strictMode: status.strictMode,
  platform: status.platform,
  tlsVersion: status.tlsVersion,
  secureDomains: status.secureDomains,
  lastValidation: status.lastValidation,
});
```

## Considerações de Produção

### Ativação do Modo Estrito

Antes de ativar `strictMode: true`:

1. Execute testes completos em ambiente de staging
2. Monitore os logs por 7-14 dias
3. Valide que não há eventos de falha
4. Faça rollback planejado disponível

### Atualização de Certificados

1. Monitorar datas de expiração
2. Ter processo de atualização documentado
3. Testar novos certificados antes de aplicar
4. Considerar pinning de múltiplos certificados para transição

### Debug e Troubleshooting

Em desenvolvimento, o pinning pode causar falhas em chamadas de rede. Use:

```typescript
// Modo desenvolvimento
if (__DEV__) {
  manager.updateConfig({ bypassOnDebug: true });
}
```

## Limitações Técnicas

1. **Firebase SDK**: O SDK Firebase gerencia suas próprias conexões HTTPS. O pinning em nível JavaScript não pode interceptar essas conexões.
2. **Confiança do Sistema**: Em iOS, a validação final é feita pelo sistema. A camada JavaScript é adicional.
3. **Updates de Sistema**: Certificados raiz podem mudar com atualizações do sistema operacional.

## Requisitos Atendidos

- **Requirement 2.2**: TLS 1.3 para PHI em trânsito
- **Requirement 2.14**: Certificate Pinning para Firebase
- **Requirement 5.12**: Certificate Pinning para comunicações de API

## Referências

- [iOS App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [OWASP Certificate Pinning](https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html)
- [Certificate Transparency](https://certificate.transparency.dev/)
