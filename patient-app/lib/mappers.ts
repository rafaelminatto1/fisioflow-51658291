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
      goals: data.goals,
      medicalHistory: data.medical_history,
      weight: data.weight,
      height: data.height,
      activityLevel: data.activity_level,
      birthDate: data.birth_date && typeof data.birth_date !== 'string' 
        ? data.birth_date.toISOString().slice(0, 10)
        : data.birth_date,
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
    };
  },

  exerciseAssignment(data: any): ExerciseAssignment {
    return {
      id: data.id,
      exerciseId: data.exercise_id,
      exercise: data.exercise ? this.exercise(data.exercise) : {
        id: '',
        name: 'Exercício',
        description: '',
        sets: 1,
        reps: 1,
      },
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
      participantId: data.participant_id,
      participantName: data.participant_name,
      participantAvatar: data.participant_avatar,
      lastMessage: data.last_message,
      lastMessageAt: data.last_message_at,
      unreadCount: data.unread_count || 0,
    };
  },

  message(data: any): Message {
    return {
      id: data.id,
      senderId: data.sender_id,
      content: data.content,
      createdAt: data.created_at,
      type: data.type || 'text',
      attachmentUrl: data.attachment_url,
      attachmentName: data.attachment_name,
    };
  },
};
