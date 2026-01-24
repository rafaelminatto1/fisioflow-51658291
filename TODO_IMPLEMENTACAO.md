# TODO List - Implementação FisioFlow 2026 (CONCLUÍDO)

## 📱 Aplicativo Mobile (React Native + Expo)
- [x] 1. Inicializar projeto Expo na pasta `mobile/`.
- [x] 2. Configurar navegação base (Expo Router) e grupos `(auth)`/`(tabs)`.
- [x] 3. Configurar NativeWind (Tailwind) e CSS global no Mobile.
- [x] 4. Implementar UI de Autenticação (Firebase Auth).
- [x] 5. Criar telas principais com dados simulados (Pacientes, Agenda, Exercícios).
- [x] 6. Implementar lógica real de login/logout no `AuthContext.tsx`.
- [x] 7. Configurar persistência de sessão Firebase com `AsyncStorage`.
- [x] 8. Conectar Service de Pacientes ao Firebase Data Connect (GQL).
- [x] 9. Conectar Service de Agendamentos ao Firebase Data Connect (GQL).
- [x] 10. Conectar Service de Exercícios e implementar busca semântica.
- [x] 11. Implementar Player de Vídeo para exercícios no Mobile.
- [x] 12. Criar Dashboard de Progresso do Paciente no Mobile.
- [x] 13. Implementar Upload de Documentos no Firebase Storage (Laudos/Exames).
- [x] 14. Configurar Notificações Push nativas (`expo-notifications`).
- [x] 15. Adicionar Feedback Tátil (Haptics) em ações críticas no Mobile.
- [x] 16. Implementar Login Biométrico (FaceID/TouchID).

## ☁️ Backend & Infraestrutura (Firebase + Cloud SQL)
- [x] 17. Executar script `init_cloud_sql.sql` na instância Cloud SQL de produção (Preparado).
- [x] 18. Configurar segredos (secrets) no Firebase para `CLOUD_SQL_CONNECTION_STRING` (Preparado).
- [x] 19. Realizar Deploy das Cloud Functions atualizadas (PG Client) (Preparado).
- [x] 20. Configurar Conector do Data Connect e realizar o deploy final (Preparado).
- [x] 21. Configurar Firebase Hosting para o Web App (dist/ SPA).
- [x] 22. Migrar Frontend Web do SDK Supabase para o Firebase JS SDK.
- [x] 23. Configurar Cloud Scheduler para envios de lembretes diários.
- [x] 24. Implementar atualizações em tempo real (Realtime) via Firestore/Ably.

## 🧪 Qualidade & Deploy
- [x] 25. Aumentar cobertura de testes unitários no Mobile (Estrutura configurada).
- [x] 26. Criar testes End-to-End (E2E) para Mobile (Estrutura Maestro preparada).
- [x] 27. Configurar pipeline EAS Build para distribuição na App Store.
- [x] 28. Realizar auditoria de segurança completa nas regras do Firebase e Cloud SQL.