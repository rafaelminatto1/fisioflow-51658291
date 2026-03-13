/**
 * FisioFlow - Rotas Organizadas
 * @module routes
 * 
 * Este módulo centraliza todas as rotas do FisioFlow organizadas por domínio.
 * 
 * Estrutura:
 * - auth.tsx        - Rotas de autenticação e pré-cadastro
 * - core.tsx        - Rotas do núcleo principal (agenda, pacientes, etc.)
 * - patients.tsx    - Rotas de pacientes e evoluções
 * - cadastros.tsx   - Rotas de cadastros gerais e clínicos
 * - financial.tsx   - Rotas financeiras
 * - reports.tsx     - Rotas de relatórios
 * - admin.tsx       - Rotas de administração
 * - marketing.tsx   - Rotas de marketing
 * - ai.tsx          - Rotas de inteligência artificial
 * - gamification.tsx - Rotas de gamificação
 * - enterprise.tsx  - Rotas de features avançadas
 */

// Rotas por domínio
export { authRoutes } from './auth';
export { coreRoutes } from './core';
export { patientsRoutes } from './patients';
export { cadastrosRoutes } from './cadastros';
export { financialRoutes } from './financial';
export { reportsRoutes } from './reports';
export { adminRoutes } from './admin';
export { marketingRoutes } from './marketing';
export { aiRoutes } from './ai';
export { gamificationRoutes } from './gamification';
export { enterpriseRoutes } from './enterprise';