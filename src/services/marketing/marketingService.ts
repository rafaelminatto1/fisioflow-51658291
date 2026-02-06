/**
 * Marketing Service - Enhanced with LGPD Consent Management
 */
import {

  db,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  serverTimestamp,
} from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const storage = getFirebaseStorage();

// ==================== TYPES ====================

export interface MarketingConsent {
  patient_id: string;
  organization_id: string;
  social_media: boolean;
  educational_material: boolean;
  website: boolean;
  signed_at: string;
  signed_by: string;
  signature_ip?: string;
  expires_at?: string;
  is_active: boolean;
}

export interface MarketingExportParams {
  patientId: string;
  organizationId: string;
  assetAId?: string;
  assetBId?: string;
  metrics: string[];
  isAnonymized: boolean;
  exportType?: 'video_comparison' | 'before_after' | 'timelapse' | 'certificate';
}

export interface ReviewAutomationConfig {
  organization_id: string;
  enabled: boolean;
  trigger_status: string[];
  message_template: string;
  delay_hours: number;
  google_place_id?: string;
}

export interface RecallCampaign {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  days_without_visit: number;
  message_template: string;
  enabled: boolean;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  patient_id: string;
  organization_id: string;
  code: string;
  reward_type: 'discount' | 'session' | 'product';
  reward_value: number;
  referrer_reward?: {
    type: 'discount' | 'session';
    value: number;
  };
  uses: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
}

export interface FisioLinkConfig {
  organization_id: string;
  slug: string;
  whatsapp_number?: string;
  google_maps_url?: string;
  phone?: string;
  show_before_after: boolean;
  show_reviews: boolean;
  custom_message?: string;
  theme: 'light' | 'dark' | 'clinical';
  primary_color: string;
}

export interface BirthdayAutomationConfig {
  organization_id: string;
  enabled: boolean;
  message_template: string;
  send_whatsapp: boolean;
  send_email: boolean;
}

// ==================== CONSENT MANAGEMENT ====================

/**
 * Check if patient has valid marketing consent for specific use
 */
export const checkMarketingConsent = async (
  patientId: string,
  consentType: 'social_media' | 'educational_material' | 'website' | 'any' = 'any'
): Promise<boolean> => {
  logger.info(`[MarketingService] Checking consent for patient ${patientId}`, { patientId, consentType }, 'marketingService');

  try {
    const consentRef = doc(db, 'marketing_consents', patientId);
    const consentSnap = await getDoc(consentRef);

    if (!consentSnap.exists()) {
      return false;
    }

    const consent = consentSnap.data() as MarketingConsent;

    // Check if consent is active and not expired
    if (!consent.is_active) {
      return false;
    }

    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      return false;
    }

    // Check specific consent type
    if (consentType === 'any') {
      return consent.social_media || consent.educational_material || consent.website;
    }

    return consent[consentType] || false;
  } catch (error) {
    logger.error('[MarketingService] Error checking consent', error, 'marketingService');
    return false;
  }
};

/**
 * Get full consent record for a patient
 */
export const getPatientConsent = async (patientId: string): Promise<MarketingConsent | null> => {
  try {
    const consentRef = doc(db, 'marketing_consents', patientId);
    const consentSnap = await getDoc(consentRef);

    if (!consentSnap.exists()) {
      return null;
    }

    return consentSnap.data() as MarketingConsent;
  } catch (error) {
    logger.error('[MarketingService] Error getting patient consent', error, 'marketingService');
    return null;
  }
};

/**
 * Create or update marketing consent
 */
export const setMarketingConsent = async (
  patientId: string,
  organizationId: string,
  consentData: Omit<MarketingConsent, 'patient_id' | 'organization_id' | 'signed_at'>
): Promise<void> => {
  try {
    const consentRef = doc(db, 'marketing_consents', patientId);

    const consent: MarketingConsent = {
      patient_id: patientId,
      organization_id: organizationId,
      ...consentData,
      signed_at: new Date().toISOString(),
    };

    await setDoc(consentRef, consent, { merge: true });

    logger.info('[MarketingService] Marketing consent updated', { patientId }, 'marketingService');
  } catch (error) {
    logger.error('[MarketingService] Error setting consent', error, 'marketingService');
    throw error;
  }
};

/**
 * Revoke marketing consent
 */
export const revokeMarketingConsent = async (patientId: string): Promise<void> => {
  try {
    const consentRef = doc(db, 'marketing_consents', patientId);

    await updateDoc(consentRef, {
      is_active: false,
      revoked_at: new Date().toISOString(),
    });

    logger.info('[MarketingService] Marketing consent revoked', { patientId }, 'marketingService');
  } catch (error) {
    logger.error('[MarketingService] Error revoking consent', error, 'marketingService');
    throw error;
  }
};

// ==================== EXPORT MANAGEMENT ====================

/**
 * Create marketing export record (video, image, etc.)
 */
export const createMarketingExportRecord = async (
  params: MarketingExportParams,
  blob: Blob,
  fileName?: string
): Promise<{ success: boolean; url: string; id?: string; error?: string }> => {
  logger.info('[MarketingService] Creating export record', { params }, 'marketingService');

  try {
    // 1. Check consent before proceeding
    const hasConsent = await checkMarketingConsent(params.patientId, 'social_media');
    if (!hasConsent && !params.isAnonymized) {
      return {
        success: false,
        url: '',
        error: 'Patient does not have marketing consent for this type of export',
      };
    }

    // 2. Upload Blob to Firebase Storage
    const finalFileName = fileName || `marketing_${params.patientId}_${Date.now()}.mp4`;
    const storageRef = ref(storage, `marketing_exports/${params.organizationId}/${finalFileName}`);

    await uploadBytes(storageRef, blob, {
      customMetadata: {
        contentType: blob.type || 'video/mp4',
        patientId: params.patientId,
        organizationId: params.organizationId,
        isAnonymized: params.isAnonymized.toString(),
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);

    // 3. Insert DB Record in Firestore
    const exportData = {
      patient_id: params.patientId,
      organization_id: params.organizationId,
      export_type: params.exportType || 'video_comparison',
      file_path: `marketing_exports/${params.organizationId}/${finalFileName}`,
      file_url: downloadUrl,
      is_anonymized: params.isAnonymized,
      metrics_overlay: params.metrics,
      created_at: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'marketing_exports'), exportData);

    logger.info('[MarketingService] Export record created', { id: docRef.id }, 'marketingService');

    return {
      success: true,
      url: downloadUrl,
      id: docRef.id,
    };
  } catch (error) {
    logger.error('[MarketingService] Error creating export record', error, 'marketingService');
    return {
      success: false,
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete marketing export
 */
export const deleteMarketingExport = async (exportId: string): Promise<void> => {
  try {
    const exportRef = doc(db, 'marketing_exports', exportId);
    const exportSnap = await getDoc(exportRef);

    if (exportSnap.exists()) {
      const data = exportSnap.data();
      // Delete from storage
      try {
        const storageRef = ref(storage, data.file_path);
        await deleteObject(storageRef);
      } catch (err) {
        logger.warn('[MarketingService] Could not delete file from storage', err, 'marketingService');
      }

      // Delete from database
      await updateDoc(exportRef, { deleted: true, deleted_at: serverTimestamp() });
    }
  } catch (error) {
    logger.error('[MarketingService] Error deleting export', error, 'marketingService');
    throw error;
  }
};

/**
 * Get marketing exports for a patient
 */
export const getPatientMarketingExports = async (patientId: string): Promise<unknown[]> => {
  try {
    const q = query(
      collection(db, 'marketing_exports'),
      where('patient_id', '==', patientId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
  } catch (error) {
    logger.error('[MarketingService] Error getting exports', error, 'marketingService');
    return [];
  }
};

// ==================== REVIEW AUTOMATION ====================

/**
 * Get review automation config for organization
 */
export const getReviewAutomationConfig = async (
  organizationId: string
): Promise<ReviewAutomationConfig | null> => {
  try {
    const configRef = doc(db, 'marketing_configs', `${organizationId}_reviews`);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return {
        organization_id: organizationId,
        enabled: false,
        trigger_status: ['alta', 'concluido'],
        message_template: 'Olá {nome}! Esperamos que esteja ótimo. Gostaríamos de saber sua opinião sobre nosso atendimento: {review_link}',
        delay_hours: 24,
      };
    }

    return configSnap.data() as ReviewAutomationConfig;
  } catch (error) {
    logger.error('[MarketingService] Error getting review config', error, 'marketingService');
    return null;
  }
};

/**
 * Update review automation config
 */
export const updateReviewAutomationConfig = async (
  organizationId: string,
  config: Partial<ReviewAutomationConfig>
): Promise<void> => {
  try {
    const configRef = doc(db, 'marketing_configs', `${organizationId}_reviews`);
    await setDoc(configRef, {
      ...config,
      organization_id: organizationId,
      updated_at: serverTimestamp(),
    }, { merge: true });

    logger.info('[MarketingService] Review config updated', { organizationId }, 'marketingService');
  } catch (error) {
    logger.error('[MarketingService] Error updating review config', error, 'marketingService');
    throw error;
  }
};

// ==================== RECALL CAMPAIGNS ====================

/**
 * Get recall campaigns for organization
 */
export const getRecallCampaigns = async (organizationId: string): Promise<RecallCampaign[]> => {
  try {
    const q = query(
      collection(db, 'recall_campaigns'),
      where('organization_id', '==', organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as RecallCampaign));
  } catch (error) {
    logger.error('[MarketingService] Error getting recall campaigns', error, 'marketingService');
    return [];
  }
};

/**
 * Create recall campaign
 */
export const createRecallCampaign = async (
  campaign: Omit<RecallCampaign, 'id' | 'organization_id' | 'created_at'>,
  organizationId: string
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'recall_campaigns'), {
      ...campaign,
      organization_id: organizationId,
      created_at: serverTimestamp(),
    });

    logger.info('[MarketingService] Recall campaign created', { id: docRef.id }, 'marketingService');
    return docRef.id;
  } catch (error) {
    logger.error('[MarketingService] Error creating recall campaign', error, 'marketingService');
    throw error;
  }
};

/**
 * Update recall campaign
 */
export const updateRecallCampaign = async (campaignId: string, updates: Partial<RecallCampaign>): Promise<void> => {
  try {
    const campaignRef = doc(db, 'recall_campaigns', campaignId);
    await updateDoc(campaignRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    logger.error('[MarketingService] Error updating recall campaign', error, 'marketingService');
    throw error;
  }
};

/**
 * Delete recall campaign
 */
export const deleteRecallCampaign = async (campaignId: string): Promise<void> => {
  try {
    const campaignRef = doc(db, 'recall_campaigns', campaignId);
    await updateDoc(campaignRef, { deleted: true, deleted_at: serverTimestamp() });
  } catch (error) {
    logger.error('[MarketingService] Error deleting recall campaign', error, 'marketingService');
    throw error;
  }
};

/**
 * Find patients for recall
 */
export const findPatientsForRecall = async (
  organizationId: string,
  daysWithoutVisit: number
): Promise<Array<{ patient_id: string; patient_name: string; last_visit: string }>> => {
  try {
    // In production, this would use a properly indexed query
    // For now, return empty array
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWithoutVisit);

    // This would require a composite index on patient_id and last_visit_date
    return [];
  } catch (error) {
    logger.error('[MarketingService] Error finding patients for recall', error, 'marketingService');
    return [];
  }
};

// ==================== REFERRAL PROGRAM (MGM) ====================

/**
 * Generate unique referral code for patient
 */
export const generateReferralCode = (patientId: string): string => {
  const hash = patientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const code = `FISIO${hash.toString(36).toUpperCase().padStart(4, '0')}`;
  return code.substring(0, 8);
};

/**
 * Create referral code for patient
 */
export const createReferralCode = async (
  patientId: string,
  organizationId: string,
  config: Omit<ReferralCode, 'id' | 'patient_id' | 'organization_id' | 'code' | 'created_at' | 'uses'>
): Promise<string> => {
  try {
    const code = generateReferralCode(patientId);

    const docRef = await addDoc(collection(db, 'referral_codes'), {
      patient_id: patientId,
      organization_id: organizationId,
      code,
      ...config,
      uses: 0,
      created_at: serverTimestamp(),
    });

    logger.info('[MarketingService] Referral code created', { patientId, code }, 'marketingService');
    return docRef.id;
  } catch (error) {
    logger.error('[MarketingService] Error creating referral code', error, 'marketingService');
    throw error;
  }
};

/**
 * Get referral code by code string
 */
export const getReferralCode = async (code: string): Promise<ReferralCode | null> => {
  try {
    const q = query(collection(db, 'referral_codes'), where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...normalizeFirestoreData(doc.data()) } as ReferralCode;
  } catch (error) {
    logger.error('[MarketingService] Error getting referral code', error, 'marketingService');
    return null;
  }
};

/**
 * Redeem referral code
 */
export const redeemReferralCode = async (
  code: string,
  newPatientId: string
): Promise<{ success: boolean; reward?: string; error?: string }> => {
  try {
    const referral = await getReferralCode(code);

    if (!referral) {
      return { success: false, error: 'Código inválido' };
    }

    // Check max uses
    if (referral.max_uses && referral.uses >= referral.max_uses) {
      return { success: false, error: 'Código já atingiu limite de usos' };
    }

    // Check expiration
    if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
      return { success: false, error: 'Código expirado' };
    }

    // Update uses
    await updateDoc(doc(db, 'referral_codes', referral.id), {
      uses: referral.uses + 1,
      last_used_at: serverTimestamp(),
    });

    // Log redemption
    await addDoc(collection(db, 'referral_redemptions'), {
      referral_id: referral.id,
      referrer_patient_id: referral.patient_id,
      new_patient_id: newPatientId,
      redeemed_at: serverTimestamp(),
    });

    logger.info('[MarketingService] Referral code redeemed', { code, newPatientId }, 'marketingService');

    return {
      success: true,
      reward: `${referral.reward_type === 'discount' ? `${referral.reward_value}% de desconto` : `${referral.reward_value} sessões grátis`}`,
    };
  } catch (error) {
    logger.error('[MarketingService] Error redeeming referral code', error, 'marketingService');
    return { success: false, error: 'Erro ao processar resgate' };
  }
};

/**
 * Get patient's referral code
 */
export const getPatientReferralCode = async (
  patientId: string
): Promise<ReferralCode | null> => {
  try {
    const q = query(collection(db, 'referral_codes'), where('patient_id', '==', patientId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...normalizeFirestoreData(doc.data()) } as ReferralCode;
  } catch (error) {
    logger.error('[MarketingService] Error getting patient referral code', error, 'marketingService');
    return null;
  }
};

/**
 * Get referral stats for organization
 */
export const getReferralStats = async (organizationId: string): Promise<{
  totalCodes: number;
  totalRedemptions: number;
  topReferrers: Array<{ patient_id: string; patient_name: string; redemptions: number }>;
}> => {
  try {
    // Get total codes
    const codesQuery = query(collection(db, 'referral_codes'), where('organization_id', '==', organizationId));
    const codesSnapshot = await getDocs(codesQuery);
    const totalCodes = codesSnapshot.size;

    // Get redemptions
    const redemptionsQuery = query(
      collection(db, 'referral_redemptions'),
      where('organization_id', '==', organizationId)
    );
    const redemptionsSnapshot = await getDocs(redemptionsQuery);
    const totalRedemptions = redemptionsSnapshot.size;

    return {
      totalCodes,
      totalRedemptions,
      topReferrers: [], // Would need aggregation
    };
  } catch (error) {
    logger.error('[MarketingService] Error getting referral stats', error, 'marketingService');
    return { totalCodes: 0, totalRedemptions: 0, topReferrers: [] };
  }
};

// ==================== FISIOLINK ====================

/**
 * Get FisioLink config
 */
export const getFisioLinkConfig = async (slug: string): Promise<FisioLinkConfig | null> => {
  try {
    const q = query(collection(db, 'fisio_links'), where('slug', '==', slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return normalizeFirestoreData(doc.data()) as FisioLinkConfig;
  } catch (error) {
    logger.error('[MarketingService] Error getting FisioLink config', error, 'marketingService');
    return null;
  }
};

/**
 * Get FisioLink config by organization ID
 */
export const getFisioLinkByOrganization = async (organizationId: string): Promise<FisioLinkConfig | null> => {
  try {
    const q = query(collection(db, 'fisio_links'), where('organization_id', '==', organizationId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...normalizeFirestoreData(doc.data()) } as FisioLinkConfig;
  } catch (error) {
    logger.error('[MarketingService] Error getting FisioLink by organization', error, 'marketingService');
    return null;
  }
};

/**
 * Update FisioLink config
 */
export const updateFisioLinkConfig = async (
  organizationId: string,
  config: Partial<FisioLinkConfig>
): Promise<string> => {
  try {
    const slug = config.slug || organizationId;

    await setDoc(doc(db, 'fisio_links', slug), {
      ...config,
      organization_id: organizationId,
      slug,
      updated_at: serverTimestamp(),
    }, { merge: true });

    logger.info('[MarketingService] FisioLink config updated', { slug }, 'marketingService');
    return slug;
  } catch (error) {
    logger.error('[MarketingService] Error updating FisioLink config', error, 'marketingService');
    throw error;
  }
};

/**
 * Track FisioLink click
 */
export const trackFisioLinkClick = async (
  slug: string,
  button: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'fisio_link_analytics'), {
      slug,
      button,
      clicked_at: serverTimestamp(),
    });
  } catch (error) {
    logger.error('[MarketingService] Error tracking FisioLink click', error, 'marketingService');
  }
};

/**
 * Get FisioLink analytics
 */
export const getFisioLinkAnalytics = async (
  slug: string,
  _startDate?: Date,
  _endDate?: Date
): Promise<{ totalClicks: number; clicksByButton: Record<string, number> }> => {
  try {
    const q = query(collection(db, 'fisio_link_analytics'), where('slug', '==', slug));
    const snapshot = await getDocs(q);

    const clicksByButton: Record<string, number> = {};
    let totalClicks = 0;

    snapshot.forEach(doc => {
      const data = normalizeFirestoreData(doc.data());
      const button = data.button || 'unknown';
      clicksByButton[button] = (clicksByButton[button] || 0) + 1;
      totalClicks++;
    });

    return { totalClicks, clicksByButton };
  } catch (error) {
    logger.error('[MarketingService] Error getting FisioLink analytics', error, 'marketingService');
    return { totalClicks: 0, clicksByButton: {} };
  }
};

// ==================== BIRTHDAY AUTOMATION ====================

/**
 * Get birthday automation config
 */
export const getBirthdayAutomationConfig = async (
  organizationId: string
): Promise<BirthdayAutomationConfig> => {
  try {
    const configRef = doc(db, 'marketing_configs', `${organizationId}_birthdays`);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return {
        organization_id: organizationId,
        enabled: false,
        message_template: 'Olá {nome}! Desejamos um feliz aniversário! 🎉',
        send_whatsapp: true,
        send_email: false,
      };
    }

    return configSnap.data() as BirthdayAutomationConfig;
  } catch (error) {
    logger.error('[MarketingService] Error getting birthday config', error, 'marketingService');
    return {
      organization_id: organizationId,
      enabled: false,
      message_template: '',
      send_whatsapp: false,
      send_email: false,
    };
  }
};

/**
 * Update birthday automation config
 */
export const updateBirthdayAutomationConfig = async (
  organizationId: string,
  config: Partial<BirthdayAutomationConfig>
): Promise<void> => {
  try {
    const configRef = doc(db, 'marketing_configs', `${organizationId}_birthdays`);

    await setDoc(configRef, {
      ...config,
      organization_id: organizationId,
      updated_at: serverTimestamp(),
    }, { merge: true });

    logger.info('[MarketingService] Birthday config updated', { organizationId }, 'marketingService');
  } catch (error) {
    logger.error('[MarketingService] Error updating birthday config', error, 'marketingService');
    throw error;
  }
};

/**
 * Get patients with birthday today
 */
export const getTodayBirthdays = async (_organizationId: string): Promise<Array<{ id: string; name: string; phone: string; email: string }>> => {
  try {
    // This would require a properly indexed query or a Cloud Function
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('[MarketingService] Error getting today birthdays', error, 'marketingService');
    return [];
  }
};

// ==================== ROI CALCULATOR ====================

/**
 * Calculate marketing ROI
 */
export const calculateMarketingROI = async (
  organizationId: string,
  startDate: Date,
  endDate: Date,
  adSpend: number
): Promise<{
  totalLeads: number;
  costPerLead: number;
  conversionRate: number;
  roi: number;
  returnOnAdSpend: number;
}> => {
  try {
    // Get new patients from marketing sources
    const patientsQuery = query(
      collection(db, 'patients'),
      where('organization_id', '==', organizationId),
      where('created_at', '>=', startDate.toISOString()),
      where('created_at', '<=', endDate.toISOString())
    );

    const snapshot = await getDocs(patientsQuery);
    const totalLeads = snapshot.size;

    // Get converted leads (became paying patients)
    const convertedLeads = snapshot.docs.filter(doc => {
      const data = normalizeFirestoreData(doc.data());
      return data.status === 'active' || data.has_paid === true;
    }).length;

    const costPerLead = totalLeads > 0 ? adSpend / totalLeads : 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Estimate average revenue per patient
    const avgRevenuePerPatient = 500;
    const totalRevenue = convertedLeads * avgRevenuePerPatient;
    const roi = adSpend > 0 ? ((totalRevenue - adSpend) / adSpend) * 100 : 0;
    const roas = adSpend > 0 ? totalRevenue / adSpend : 0;

    return {
      totalLeads,
      costPerLead,
      conversionRate,
      roi,
      returnOnAdSpend: roas,
    };
  } catch (error) {
    logger.error('[MarketingService] Error calculating ROI', error, 'marketingService');
    return {
      totalLeads: 0,
      costPerLead: 0,
      conversionRate: 0,
      roi: 0,
      returnOnAdSpend: 0,
    };
  }
};

// ==================== CAPTION GENERATOR ====================

export const generateSocialCaption = (
  type: 'technical' | 'motivational' | 'educational',
  metrics: string[],
  clinicName?: string
): string => {
  const baseDisclaimer = clinicName
    ? `\n\n${clinicName} - Fisioterapia Especializada\n⚠️ Resultados variam. Conteúdo informativo. Avaliação individual é indispensável.`
    : "\n\n⚠️ Resultados variam. Conteúdo informativo. Avaliação individual é indispensável.";

  switch (type) {
    case 'motivational':
      return `Incrível a dedicação deste paciente! 💪\n\nComparamos a evolução biomecânica e os números não mentem. O foco no tratamento traz resultados reais.\n\n${metrics.map(m => `✅ ${m}`).join('\n')}\n\n#Fisioterapia #Evolução #Saúde #Movimento${baseDisclaimer}`;

    case 'educational':
      return `Sabia que a ${metrics[0] || 'postura'} influencia diretamente na sua dor?\n\nVeja a diferença antes e depois do tratamento focado em biomecânica. Dores crônicas muitas vezes têm origem mecânica.\n\nAgende sua avaliação e transforme sua qualidade de vida.${baseDisclaimer}`;

    case 'technical':
    default:
      return `📊 Análise Comparativa de Movimento\n\nObserva-se melhora significativa nos parâmetros biomecânicos:\n${metrics.map(m => `• ${m}`).join('\n')}\n\nProtocolo de reabilitação neuromuscular aplicado com sucesso.${baseDisclaimer}`;
  }
};

/**
 * Generate myth vs truth carousel content
 */
export const generateMythVsTruth = (topic: string, myth: string, truth: string): Array<{
  type: 'myth' | 'truth' | 'explanation';
  title: string;
  content: string;
}> => {
  return [
    {
      type: 'myth',
      title: `MITO: ${myth}`,
      content: `Muitas pessoas acreditam que "${myth}", mas será que isso é verdade?`,
    },
    {
      type: 'truth',
      title: `VERDADE`,
      content: `Na realidade, ${truth}. A ciência explica melhor...`,
    },
    {
      type: 'explanation',
      title: `O QUE A CIÊNCIA DIZ`,
      content: `Estudos mostram que ${truth}. Consulte um fisioterapeuta para orientação personalizada.`,
    },
  ];
};