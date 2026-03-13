/**
 * FisioFlow - Rotas Organizadas
 * @module routes
 * 
 * Este módulo centraliza todas as rotas do FisioFlow organizadas por domínio.
 * 
 * Estrutura:
 * - auth.tsx      - Rotas de autenticação e pré-cadastro
 * - core.tsx      - Rotas do núcleo principal (agenda, pacientes, etc.)
 * - cadastros.tsx - Rotas de cadastros gerais e clínicos
 * - financial.tsx - Rotas financeiras
 * - reports.tsx   - Rotas de relatórios
 * - admin.tsx     - Rotas de administração
 * - marketing.tsx - Rotas de marketing
 */

export { authRoutes } from './auth';
export { coreRoutes } from './core';
export { cadastrosRoutes } from './cadastros';
export { financialRoutes } from './financial';
export { reportsRoutes } from './reports';
export { adminRoutes } from './admin';
export { marketingRoutes } from './marketing';