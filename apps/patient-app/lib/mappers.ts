import { User } from '@/types/auth';
import { 
  PatientProfile, 
  Appointment, 
  Exercise, 
  ExerciseAssignment, 
  Notification, 
  Evolution, 
  Conversation, 
  Message 
} from '@/types/api';

/**
 * Mappers to convert API response (snake_case) to internal model (camelCase)
 */

export const Mappers = {
  user(data: any): User {
    return {
      id: data.id,
      email: data.email,
      name: data.name || 'Usuário',
      role: data.role || 'patient',
      clinicId: data.clinic_id,
      avatarUrl: data.avatar_url || data.image,
      professionalId: data.professional_id,
      professionalName: data.professional_name,
      birthDate: data.birth_date,
      gender: data.gender,
      phone: data.phone,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  patientProfile(data: any): PatientProfile {
    return {
      ...this.user(data),
      birthDate:
        typeof data.birth_date === 'string'
          ? data.birth_date
          : typeof data.birthDate === 'string'
            ? data.birthDate
            : undefined,
      goals: data.goals,
      medicalHistory: data.medical_history,
      weight: data.weight,
      height: data.height,
      activityLevel: data.activity_level,
      cpf: data.cpf,
      photoUrl: data.photo_url || data.photoUrl,
      address: data.address,
    };
  },

  appointment(data: any): Appointment {
    return {
      id: data.id,
      patientId: data.patient_id,
      professionalId: data.professional_id,
      professionalName: data.professional_name,
      date: data.date,
      time: data.time,
      type: data.type,
      status: data.status,
      notes: data.notes,
      isGroup: data.is_group ?? data.isGroup ?? false,
      additionalNames: data.additional_names ?? data.additionalNames ?? '',
      isUnlimited: data.is_unlimited ?? data.isUnlimited ?? false,
      location: data.location,
    };
  },

  exercise(data: any): Exercise {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      sets: data.sets,
      reps: data.reps,
      holdTime: data.hold_time,
      restTime: data.rest_time,
      videoUrl: data.video_url,
      imageUrl: data.image_url,
      instructions: data.instructions,
      benefits: data.benefits,
      precautions: data.precautions,
      category: data.category,
      difficulty: data.difficulty,
      embeddingSketch: data.embedding_sketch || data.embeddingSketch,
    };
  },

  exerciseAssignment(data: any): ExerciseAssignment {
    const fallbackExercise = this.exercise({
      id: data.exercise_id || data.id || 'unknown-exercise',
      name: data.exercise_name || 'Exercício',
      description: data.exercise_description || data.notes || '',
      sets: data.sets || 0,
      reps: data.reps || 0,
      hold_time: data.hold_time,
      rest_time: data.rest_time,
      video_url: data.video_url,
      image_url: data.image_url,
      instructions: data.instructions,
      benefits: data.benefits,
      precautions: data.precautions,
      category: data.category,
      difficulty: data.difficulty,
      embedding_sketch: data.embedding_sketch || data.embeddingSketch,
    });

    return {
      id: data.id,
      exerciseId: data.exercise_id,
      exercise: data.exercise ? this.exercise(data.exercise) : fallbackExercise,
      sets: data.sets,
      reps: data.reps,
      holdTime: data.hold_time,
      restTime: data.rest_time,
      frequency: data.frequency,
      notes: data.notes,
      completed: data.completed,
      completedAt: data.completed_at,
    };
  },

  notification(data: any): Notification {
    return {
      id: data.id,
      title: data.title,
      body: data.body,
      type: data.type,
      read: data.read,
      createdAt: data.created_at,
      data: data.data,
    };
  },

  evolution(data: any): Evolution {
    return {
      id: data.id,
      date: data.date,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      painLevel: data.pain_level,
      sessionNumber: data.session_number,
      professionalName: data.professional_name,
    };
  },

  conversation(data: any): Conversation {
    return {
      id: data.id,
      participantIds: data.participantIds || [data.participant_id].filter(Boolean),
      participantNames: data.participantNames || {
        [data.participant_id]: data.participant_name || 'Usuário',
      },
      lastMessage: data.lastMessage || (
        data.last_message || data.last_message_at
          ? {
              content: data.last_message || '',
              senderId: data.participant_id,
              createdAt: data.last_message_at || null,
            }
          : undefined
      ),
      unreadCount:
        data.unreadCount && typeof data.unreadCount === 'object'
          ? data.unreadCount
          : { [data.participant_id]: Number(data.unread_count || 0) },
      updatedAt: data.updatedAt || data.last_message_at || null,
    };
  },

  message(data: any): Message {
    return {
      id: data.id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      content: data.content,
      created_at: data.created_at,
      read_at: data.read_at,
      status: data.status || 'sent',
      type: data.type || 'text',
      attachment_url: data.attachment_url,
      attachment_name: data.attachment_name,
    };
  },
};
