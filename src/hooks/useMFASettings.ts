/**
 * useMFASettings - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('mfa_settings') → Firestore collection 'mfa_settings'
 * - supabase.rpc('log_security_event') → Firestore collection 'security_events' (pending)
 * - supabase.functions.invoke('send-mfa-otp') → Firebase Cloud Function (pending)
 * - supabase.rpc('verify_mfa_otp') → Client-side verification + Cloud Function (pending)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, setDoc } from '@/integrations/firebase/app';
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { getFirebaseAuth, db } from '@/integrations/firebase/app';


const auth = getFirebaseAuth();

export type MFAMethod = 'totp' | 'sms' | 'email';

export interface MFASettings {
  id: string;
  user_id: string;
  mfa_enabled: boolean;
  mfa_method: MFAMethod | null;
  backup_codes: string[] | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to generate backup codes
const generateBackupCodes = (): string[] => {
  return Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );
};

// Helper to log security events (would normally be a Cloud Function)
const logSecurityEvent = async (
  userId: string,
  eventType: string,
  severity: 'info' | 'warning' | 'error',
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    await addDoc(collection(db, 'security_events'), {
      user_id: userId,
      event_type: eventType,
      severity,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to log security event', error, 'useMFASettings');
  }
};

export function useMFASettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["mfa-settings"],
    queryFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const q = query(
        collection(db, 'mfa_settings'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as MFASettings;
    },
  });

  const enableMFA = useMutation({
    mutationFn: async (method: MFAMethod) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Usuário não autenticado");

      // Gerar códigos de backup
      const backupCodes = generateBackupCodes();
      const now = new Date().toISOString();

      const settingsData = {
        user_id: firebaseUser.uid,
        mfa_enabled: true,
        mfa_method: method,
        backup_codes: backupCodes,
        last_used_at: null,
        updated_at: now,
      };

      // Check if settings already exist
      const q = query(
        collection(db, 'mfa_settings'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );
      const existingSnap = await getDocs(q);

      let result;
      if (existingSnap.empty) {
        const docRef = await addDoc(collection(db, 'mfa_settings'), {
          ...settingsData,
          created_at: now,
        });
        const snap = await getDoc(docRef);
        result = { id: snap.id, ...snap.data() };
      } else {
        await updateDoc(existingSnap.docs[0].ref, settingsData);
        const snap = await getDoc(existingSnap.docs[0].ref);
        result = { id: snap.id, ...snap.data() };
      }

      // Registrar evento de segurança
      await logSecurityEvent(firebaseUser.uid, "mfa_enabled", "info", { method });

      return { settings: result as MFASettings, backupCodes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast.success("MFA ativado com sucesso! Guarde seus códigos de backup.");
    },
    onError: (error) => {
      logger.error("Erro ao ativar MFA", error, 'useMFASettings');
      toast.error("Erro ao ativar autenticação de dois fatores");
    },
  });

  const disableMFA = useMutation({
    mutationFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Usuário não autenticado");

      const q = query(
        collection(db, 'mfa_settings'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Configuração MFA não encontrada');
      }

      await updateDoc(snapshot.docs[0].ref, {
        mfa_enabled: false,
        mfa_method: null,
        backup_codes: null,
        updated_at: new Date().toISOString(),
      });

      // Registrar evento de segurança
      await logSecurityEvent(firebaseUser.uid, "mfa_disabled", "warning");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast.success("MFA desativado");
    },
    onError: (error) => {
      logger.error("Erro ao desativar MFA", error, 'useMFASettings');
      toast.error("Erro ao desativar autenticação de dois fatores");
    },
  });

  const sendOTP = useMutation({
    mutationFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email) throw new Error("Usuário não autenticado");

      // This would normally call a Firebase Cloud Function
      // For now, we'll simulate it by storing the OTP request
      throw new Error("Função de envio de OTP requer Cloud Function implementada");

      // TODO: Implement Firebase Cloud Function for sending MFA OTP
      // const functions = getFunctions();
      // const sendMFAOtp = httpsCallable(functions, 'sendMFAOtp');
      // const result = await sendMFAOtp({ userId: firebaseUser.uid, email: firebaseUser.email });
      // return result.data;
    },
    onSuccess: () => {
      toast.success("Código enviado para seu email");
    },
    onError: (error) => {
      logger.error("Erro ao enviar OTP", error, 'useMFASettings');
      toast.error("Erro ao enviar código de verificação");
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async (code: string) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Usuário não autenticado");

      // This would normally verify against a stored OTP or use Firebase Auth
      // For now, check backup codes
      const q = query(
        collection(db, 'mfa_settings'),
        where('user_id', '==', firebaseUser.uid),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error("Configuração MFA não encontrada");
      }

      const settings = snapshot.docs[0].data() as MFASettings;

      // Check if code matches backup codes
      if (settings.backup_codes?.includes(code.toUpperCase())) {
        // Remove used backup code
        const newBackupCodes = settings.backup_codes.filter(c => c !== code.toUpperCase());
        await updateDoc(snapshot.docs[0].ref, {
          backup_codes: newBackupCodes,
          last_used_at: new Date().toISOString(),
        });
        return true;
      }

      throw new Error("Código inválido ou expirado");
    },
    onSuccess: () => {
      toast.success("Código verificado com sucesso");
    },
    onError: (error) => {
      logger.error("Erro ao verificar OTP", error, 'useMFASettings');
      toast.error("Código inválido ou expirado");
    },
  });

  return {
    settings,
    isLoading,
    isMFAEnabled: settings?.mfa_enabled ?? false,
    enableMFA: enableMFA.mutateAsync,
    disableMFA: disableMFA.mutate,
    sendOTP: sendOTP.mutateAsync,
    verifyOTP: verifyOTP.mutateAsync,
    isEnabling: enableMFA.isPending,
    isDisabling: disableMFA.isPending,
    isSendingOTP: sendOTP.isPending,
    isVerifyingOTP: verifyOTP.isPending,
  };
}
