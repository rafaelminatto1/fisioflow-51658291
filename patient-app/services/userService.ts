import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

export async function getUserById(userId: string): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('api_get_user');
    const profile = await patientApi.getProfile();
    perf.end('api_get_user', true);

    if (!profile || (profile.user_id !== userId && profile.profile?.user_id !== userId)) {
      return null;
    }

    return profile;
  }, 'getUserById');
}

export async function getProfessionalByInviteCode(inviteCode: string): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('api_get_professional_by_code');
    const professionals = await patientApi.getTherapists(inviteCode);
    perf.end('api_get_professional_by_code', true);
    return professionals[0] ?? null;
  }, 'getProfessionalByInviteCode');
}

export async function getUserStats(_userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('api_get_user_stats');
    const stats = await patientApi.getStats();
    perf.end('api_get_user_stats', true);

    return {
      totalAppointments: stats.totalAppointments,
      totalExercises: stats.totalExercises,
      completedExercises: stats.totalExercises,
      exerciseCompletionRate: stats.totalExercises > 0 ? 1 : 0,
      totalEvolutions: 0,
      totalMonths: stats.totalMonths,
    };
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
