import { CORS_ORIGINS } from "../init";
/**
 * Admin Function: Create Firebase User
 * Executar uma vez para criar usuário inicial
 */

import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { getApps } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

export const createAdminUser = onCall({ cors: CORS_ORIGINS }, async () => {
  const auth = getAuth();

  try {
    // Verificar se usuário já existe
    try {
      const existingUser = await auth.getUserByEmail('rafael.minatto@yahoo.com.br');
      return {
        success: true,
        message: 'Usuário já existe',
        uid: existingUser.uid,
        email: existingUser.email
      };
    } catch (e) {
      // Usuário não existe, continuar
    }

    // Criar novo usuário
    const user = await auth.createUser({
      email: 'rafael.minatto@yahoo.com.br',
      password: 'Yukari30@',
      emailVerified: true,
      displayName: 'Rafael Minatto',
    });

    return {
      success: true,
      message: 'Usuário criado com sucesso',
      uid: user.uid,
      email: user.email,
      loginUrl: 'https://fisioflow-migration.web.app/login'
    };
  } catch (error: any) {
    throw new Error(`Erro ao criar usuário: ${error.message}`);
  }
});
