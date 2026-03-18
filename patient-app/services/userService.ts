import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';
import { PatientProfile, Therapist, PatientStats } from '@/types/api';

export async function getUserById(userId: string): Promise<Result<PatientProfile | null>> {
  return asyncResult(async () => {
    perf.start('api_get_user');
    const profile = await patientApi.getProfile();
    perf.end('api_get_user', true);

    if (!profile || profile.id !== userId) {
      return null;
    }

    return profile;
  }, 'getUserById');
}

export async function getProfessionalByInviteCode(inviteCode: string): Promise<Result<Therapist | null>> {
  return asyncResult(async () => {
    perf.start('api_get_professional_by_code');
    const professionals = await patientApi.getTherapists(inviteCode);
    perf.end('api_get_professional_by_code', true);
    return professionals[0] ?? null;
  }, 'getProfessionalByInviteCode');
}

export async function getUserStats(_userId: string): Promise<Result<PatientStats>> {
  return asyncResult(async () => {
    perf.start('api_get_user_stats');
    const stats = await patientApi.getStats();
    perf.end('api_get_user_stats', true);

    return stats;
  }, 'getUserStats');
}

export interface UserProfileUpdate {
  name?: string;
  phone?: string;
  photoURL?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate,
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('api_update_user_profile');

    await patientApi.updateProfile({
      name: updates.name,
      phone: updates.phone,
      photo_url: updates.photoURL,
      birth_date: updates.dateOfBirth,
      gender: updates.gender,
      address: updates.address
        ? {
            street: updates.address,
            city: updates.city,
            state: updates.state,
            zipCode: updates.zipCode,
          }
        : undefined,
      emergency_contact: updates.emergencyContact,
      emergency_phone: updates.emergencyContactPhone,
    });

    perf.end('api_update_user_profile', true);
    log.info('USER', 'Profile updated', { userId, updates });
  }, 'updateUserProfile');
}
