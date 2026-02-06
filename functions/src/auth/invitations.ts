/**
 * Cloud Functions: Convites de usuários
 * createUserInvitation, getInvitationByToken, consumeInvitation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { firestore } from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = firestore();

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Cria convite e retorna token e expires_at.
 * Frontend (InviteUserModal) chama como createUserInvitation.
 */
export const createUserInvitationHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { email, role = 'fisioterapeuta' } = request.data as { email: string; role?: string };
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'email é obrigatório');
  }

  const profileSnap = await db.collection('profiles').doc(request.auth.uid).get();
  const profile = profileSnap.data();
  const organizationId = profile?.organization_id || null;

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitationData = {
    email: email.trim().toLowerCase(),
    role: role || 'fisioterapeuta',
    token,
    invited_by: request.auth.uid,
    organization_id: organizationId,
    expires_at: expiresAt.toISOString(),
    used_at: null,
    created_at: new Date().toISOString(),
  };

  const docRef = await db.collection('user_invitations').add(invitationData);
  logger.info(`Invitation created: ${docRef.id} for ${invitationData.email}`);

  return {
    token,
    expires_at: expiresAt.toISOString(),
    id: docRef.id,
  };
};

export const createUserInvitation = onCall(
  { cors: true, memory: '512MiB', maxInstances: 1 },
  createUserInvitationHandler
);

/**
 * Retorna dados do convite por token (para pré-preencher email na página de Auth).
 * Não requer autenticação (usuário ainda não tem conta).
 */
export const getInvitationByTokenHandler = async (request: any) => {
  const { token } = request.data as { token: string };
  if (!token) {
    throw new HttpsError('invalid-argument', 'token é obrigatório');
  }

  const snap = await db
    .collection('user_invitations')
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    return { valid: false, email: null, role: null, organization_id: null };
  }

  const doc = snap.docs[0];
  const data = doc.data();
  if (data.used_at) {
    return { valid: false, email: null, role: null, organization_id: null };
  }
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, email: null, role: null, organization_id: null };
  }

  return {
    valid: true,
    email: data.email,
    role: data.role || 'fisioterapeuta',
    organization_id: data.organization_id || null,
    invitation_id: doc.id,
  };
};

export const getInvitationByToken = onCall(
  { cors: true, memory: '512MiB', maxInstances: 1 },
  getInvitationByTokenHandler
);

/**
 * Marca convite como usado e atualiza o perfil do usuário com role e organization_id.
 * Chamado após signup/signin quando o usuário acessou via link de convite.
 */
export const consumeInvitationHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { token } = request.data as { token: string };
  if (!token) {
    throw new HttpsError('invalid-argument', 'token é obrigatório');
  }

  const snap = await db
    .collection('user_invitations')
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError('not-found', 'Convite não encontrado');
  }

  const docRef = snap.docs[0].ref;
  const data = snap.docs[0].data();
  if (data.used_at) {
    return { success: true, message: 'Convite já utilizado' };
  }

  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    throw new HttpsError('failed-precondition', 'Convite expirado');
  }

  await docRef.update({
    used_at: new Date().toISOString(),
    used_by: request.auth.uid,
  });

  const profileRef = db.collection('profiles').doc(request.auth.uid);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) {
    const updates: Record<string, unknown> = {
      role: data.role || 'fisioterapeuta',
      updated_at: new Date().toISOString(),
    };
    if (data.organization_id) {
      updates.organization_id = data.organization_id;
    }
    await profileRef.update(updates);
  }

  logger.info(`Invitation consumed: ${docRef.id} by ${request.auth.uid}`);
  return { success: true };
};

export const consumeInvitation = onCall(
  { cors: true, memory: '512MiB', maxInstances: 1 },
  consumeInvitationHandler
);
