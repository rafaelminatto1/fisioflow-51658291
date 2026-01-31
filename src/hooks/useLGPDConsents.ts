/**
 * useLGPDConsents - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('lgpd_consents') → Firestore collection 'lgpd_consents'
 * - supabase.auth.getUser() → getFirebaseAuth().currentUser
 * - supabase.rpc('manage_consent') → Client-side upsert with setDoc
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFirebaseAuth, db } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const auth = getFirebaseAuth();

export type ConsentType =
  | 'dados_pessoais'
  | 'dados_sensiveis'
  | 'comunicacao_marketing'
  | 'compartilhamento_terceiros';

export interface LGPDConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

const CONSENT_VERSION = '1.0';

export function useLGPDConsents() {
  const queryClient = useQueryClient();

  const { data: consents, isLoading } = useQuery({
    queryKey: ["lgpd-consents"],
    queryFn: async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return [];

      const q = query(
        collection(db, 'lgpd_consents'),
        where('user_id', '==', firebaseUser.uid),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LGPDConsent[];
    },
  });

  const manageConsent = useMutation({
    mutationFn: async ({
      consentType,
      granted,
    }: {
      consentType: ConsentType;
      granted: boolean;
    }) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Usuário não autenticado");

      // Use user_id + consent_type as composite key for document ID
      const consentDocId = `${firebaseUser.uid}_${consentType}`;
      const consentRef = doc(db, 'lgpd_consents', consentDocId);

      // Check if consent already exists
      const consentSnap = await getDoc(consentRef);
      const now = new Date().toISOString();

      const consentData: Partial<LGPDConsent> = {
        user_id: firebaseUser.uid,
        consent_type: consentType,
        granted,
        version: CONSENT_VERSION,
        updated_at: now,
      };

      if (granted) {
        consentData.granted_at = now;
        consentData.revoked_at = null;
      } else {
        consentData.revoked_at = now;
      }

      // If it exists, preserve created_at
      if (consentSnap.exists()) {
        const existing = consentSnap.data();
        consentData.created_at = existing.created_at;
      } else {
        consentData.created_at = now;
      }

      await setDoc(consentRef, consentData, { merge: true });

      return {
        id: consentDocId,
        ...consentData,
      } as LGPDConsent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lgpd-consents"] });
      toast.success(
        variables.granted
          ? "Consentimento concedido com sucesso"
          : "Consentimento revogado com sucesso"
      );
    },
    onError: (error) => {
      logger.error("Erro ao gerenciar consentimento", error, 'useLGPDConsents');
      toast.error("Erro ao atualizar consentimento");
    },
  });

  const hasConsent = (consentType: ConsentType): boolean => {
    if (!consents) return false;
    const consent = consents.find((c) => c.consent_type === consentType);
    return consent?.granted ?? false;
  };

  return {
    consents,
    isLoading,
    manageConsent: manageConsent.mutate,
    isManaging: manageConsent.isPending,
    hasConsent,
  };
}
