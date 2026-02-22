# App Store Compliance - Quick Reference

## 🎯 Objetivo
Tornar o FisioFlow Professional App compatível com as diretrizes da Apple App Store, implementando políticas de privacidade, proteções de dados de saúde, e transparência total no tratamento de PHI (Protected Health Information).

## 📊 Escopo do Projeto

- **20 Requirements** principais
- **315 Acceptance Criteria** detalhados
- **6 semanas** de implementação estimada
- **10 Apple Guidelines** endereçadas

## 🚨 Problemas Críticos Identificados

1. ❌ **Ausência de Privacy Policy e Terms of Service acessíveis**
2. ❌ **Dados de saúde sem proteções adequadas (sem E2EE mencionado)**
3. ❌ **Permissões com justificativas genéricas**
4. ❌ **HealthKit mencionado mas não implementado**
5. ❌ **Autenticação sem 2FA para dados sensíveis**
6. ❌ **Falta de transparência de dados (sem tela de "Meus Dados")**
7. ❌ **Notificações push sem opt-in claro**
8. ❌ **Modelo de negócio não clarificado (IAP vs B2B)**
9. ❌ **Conteúdo médico sem disclaimers**
10. ❌ **Metadata incompleto (placeholders em eas.json)**

## 📋 Requirements Overview

### Phase 1: Legal Foundation (Week 1)
- **Req 1**: Privacy Policy and Terms of Service
- **Req 9**: Medical Content Disclaimers
- **Req 3**: Permission Justifications

### Phase 2: Security & Data Protection (Week 2-3)
- **Req 2**: PHI Data Protection and Encryption
- **Req 5**: Authentication and Security Enhancements
- **Req 4**: HealthKit Cleanup

### Phase 3: User Control & Transparency (Week 3-4)
- **Req 6**: Data Transparency and User Control
- **Req 12**: Consent Management System
- **Req 7**: Push Notifications Consent

### Phase 4: App Store Preparation (Week 4-5)
- **Req 10**: App Store Metadata and Configuration
- **Req 11**: Audit Logging
- **Req 20**: App Store Review Preparation

### Phase 5: Quality & Polish (Week 5-6)
- **Req 18**: Testing and Quality Assurance
- **Req 14**: Accessibility and Localization
- **Req 15**: Error Handling
- **Req 16**: Performance and Reliability

## 🔑 Key Deliverables

### Legal Documents
- [ ] Privacy Policy (Portuguese) - fisioflow.app/privacidade
- [ ] Terms of Service (Portuguese) - fisioflow.app/termos
- [ ] Medical Disclaimer

### App Features
- [ ] Privacy Policy screen (accessible from login + settings)
- [ ] Terms of Service screen (accessible from login + settings)
- [ ] Data Transparency Screen ("Meus Dados")
- [ ] Data Export (JSON + PDF)
- [ ] Data Deletion (with 30-day grace period)
- [ ] Consent Manager
- [ ] Audit Log viewer
- [ ] Notification Preferences
- [ ] Biometric Auth with PIN fallback

### Configuration Updates
- [ ] Update NSCameraUsageDescription
- [ ] Update NSPhotoLibraryUsageDescription
- [ ] Remove/Update NSMicrophoneUsageDescription
- [ ] Add NSLocationWhenInUseUsageDescription
- [ ] Remove HealthKit if unused
- [ ] Update eas.json (remove placeholders)

### App Store Connect
- [ ] Complete app description
- [ ] 3+ screenshots per device size
- [ ] App icon (1024x1024)
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Marketing URL
- [ ] Test account with sample data
- [ ] Review notes with testing instructions

## 🛡️ Security Requirements

### Encryption
- AES-256 for data at rest
- TLS 1.3+ for data in transit
- E2EE for SOAP notes
- Secure key management

### Authentication
- Biometric (Face ID/Touch ID) required for PHI
- PIN fallback (6+ digits)
- Auto-logout after 15 min inactivity
- 2FA optional enhancement
- Strong password requirements

### Data Protection
- RLS policies in Firestore
- No PHI in logs or analytics
- Session timeout
- Certificate pinning
- Jailbreak detection

## 📱 Apple Guidelines Addressed

| Guideline | Topic | Requirements |
|-----------|-------|--------------|
| 5.1.1 | Data Collection | 1, 6, 12, 17 |
| 5.1.3 | Health Data | 2, 5, 9, 13 |
| 5.1.5 | Location | 3 |
| 2.5.2 | Unused APIs | 4 |
| 4.5.4 | Push Notifications | 7 |
| 3.1.1 | In-App Purchase | 8 |
| 2.3.8 | Metadata | 10, 20 |
| 2.1 | Completeness | 15, 16, 18, 19 |
| 4.0 | Design | 14 |
| 5.1.2 | Data Sharing | 11, 17 |

## ✅ Pre-Submission Checklist

### Legal & Privacy
- [ ] Privacy Policy published and accessible
- [ ] Terms of Service published and accessible
- [ ] Medical disclaimers implemented
- [ ] Consent tracking implemented

### Security
- [ ] All PHI encrypted (AES-256)
- [ ] Biometric auth implemented
- [ ] Audit logging working
- [ ] Security audit completed

### Permissions
- [ ] All NSUsageDescription strings specific
- [ ] Permissions requested contextually
- [ ] Alternative workflows for denied permissions
- [ ] HealthKit removed if unused

### User Control
- [ ] Data transparency screen
- [ ] Data export (JSON + PDF)
- [ ] Data deletion with grace period
- [ ] Notification preferences

### App Store
- [ ] eas.json placeholders replaced
- [ ] Metadata complete
- [ ] Screenshots prepared
- [ ] Test account ready
- [ ] Review notes prepared

### Testing
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Security tests
- [ ] Accessibility tests
- [ ] Performance tests

## 📞 Support & Documentation

- **Privacy Email**: privacidade@fisioflow.com.br
- **Support Email**: suporte@fisioflow.com.br
- **Privacy Policy URL**: https://fisioflow.app/privacidade
- **Terms URL**: https://fisioflow.app/termos
- **Support URL**: https://fisioflow.app/ajuda

## 🎯 Success Metrics

- ✅ All 315 acceptance criteria met
- ✅ Security audit passed
- ✅ Privacy review passed
- ✅ Accessibility tests passed
- ✅ App Store submission approved on first attempt
- ✅ Crash-free rate > 99.5%
- ✅ Launch time < 3 seconds
- ✅ Test coverage > 80%

---

**For detailed requirements, see**: `requirements.md`  
**Next Step**: Review requirements with stakeholders, then proceed to design phase
