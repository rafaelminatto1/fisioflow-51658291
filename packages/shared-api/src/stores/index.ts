/**
 * FisioFlow - Zustand Stores
 *
 * Global state management with Zustand + persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Auth Store
// ============================================

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  avatar?: string;
  professionalId?: string;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'fisioflow-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// App Store
// ============================================

interface AppState {
  // UI State
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Notifications
  notificationPermission: 'granted' | 'denied' | 'not-determined';
  setNotificationPermission: (permission: 'granted' | 'denied' | 'not-determined') => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tabBarVisible: true,
      setTabBarVisible: (visible) => set({ tabBarVisible: visible }),

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (completed) =>
        set({ hasCompletedOnboarding: completed }),

      notificationPermission: 'not-determined',
      setNotificationPermission: (permission) =>
        set({ notificationPermission: permission }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'fisioflow-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// Exercises Store (for Patients)
// ============================================

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  reps?: number;
  sets?: number;
  duration?: number; // in seconds
  holdTime?: number; // in seconds
  restTime?: number; // in seconds
}

interface ExercisePlan {
  id: string;
  name: string;
  exercises: Exercise[];
  assignedDate: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  progress: {
    total: number;
    completed: number;
  };
}

interface ExercisesStore {
  // Current exercise plan
  currentPlan: ExercisePlan | null;
  setCurrentPlan: (plan: ExercisePlan | null) => void;

  // Exercise history
  exerciseHistory: Array<{
    exerciseId: string;
    completedAt: string;
    duration: number;
  }>;
  addExerciseToHistory: (entry: {
    exerciseId: string;
    completedAt: string;
    duration: number;
  }) => void;

  // Today's exercises
  todayExercises: Exercise[];
  setTodayExercises: (exercises: Exercise[]) => void;

  // Loading state
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useExercisesStore = create<ExercisesStore>()(
  persist(
    (set) => ({
      currentPlan: null,
      setCurrentPlan: (plan) => set({ currentPlan: plan }),

      exerciseHistory: [],
      addExerciseToHistory: (entry) =>
        set((state) => ({
          exerciseHistory: [...state.exerciseHistory, entry],
        })),

      todayExercises: [],
      setTodayExercises: (exercises) => set({ todayExercises: exercises }),

      loading: false,
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'fisioflow-exercises-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        exerciseHistory: state.exerciseHistory,
      }),
    }
  )
);

// ============================================
// Pain Level Store (for Patients)
// ============================================

interface PainEntry {
  id: string;
  level: number; // 0-10
  timestamp: string;
  notes?: string;
  location?: string[];
}

interface PainStore {
  // Current pain level
  currentPainLevel: number;
  setCurrentPainLevel: (level: number) => void;

  // Pain history
  painHistory: PainEntry[];
  addPainEntry: (entry: Omit<PainEntry, 'id'>) => void;
  clearPainHistory: () => void;

  // Last check-in
  lastPainCheckIn: string | null;
  setLastPainCheckIn: (timestamp: string | null) => void;
}

export const usePainStore = create<PainStore>()(
  persist(
    (set) => ({
      currentPainLevel: 0,
      setCurrentPainLevel: (level) => set({ currentPainLevel: level }),

      painHistory: [],
      addPainEntry: (entry) =>
        set((state) => ({
          painHistory: [
            ...state.painHistory,
            { ...entry, id: `pain_${Date.now()}` },
          ],
        })),
      clearPainHistory: () => set({ painHistory: [] }),

      lastPainCheckIn: null,
      setLastPainCheckIn: (timestamp) => set({ lastPainCheckIn: timestamp }),
    }),
    {
      name: 'fisioflow-pain-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// Appointments Store (for both Patients and Professionals)
// ============================================

interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'initial' | 'follow-up' | 'evaluation';
  notes?: string;
  // For patients
  professional: {
    id: string;
    name: string;
    avatar?: string;
    specialty?: string;
  };
  // For professionals
  patient: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface AppointmentsStore {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;

  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];

  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppointmentsStore = create<AppointmentsStore>((set, get) => ({
  appointments: [],
  setAppointments: (appointments) => {
    const sorted = appointments.sort((a, b) =>
      new Date(`${a.date} ${a.time}`).getTime() -
      new Date(`${b.date} ${b.time}`).getTime()
    );
    set({ appointments: sorted });
  },

  get upcomingAppointments() {
    const now = new Date();
    return get().appointments.filter(
      (apt) => new Date(`${apt.date} ${apt.time}`) >= now && apt.status === 'scheduled'
    );
  },

  get pastAppointments() {
    const now = new Date();
    return get().appointments.filter(
      (apt) => new Date(`${apt.date} ${apt.time}`) < now || apt.status !== 'scheduled'
    );
  },

  addAppointment: (appointment) =>
    set((state) => {
      const sorted = [...state.appointments, appointment].sort((a, b) =>
        new Date(`${a.date} ${a.time}`).getTime() -
        new Date(`${b.date} ${b.time}`).getTime()
      );
      return { appointments: sorted };
    }),

  updateAppointment: (id, updates) =>
    set((state) => ({
      appointments: state.appointments.map((apt) =>
        apt.id === id ? { ...apt, ...updates } : apt
      ),
    })),

  removeAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((apt) => apt.id !== id),
    })),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));

// ============================================
// Notifications Store
// ============================================

interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'appointment' | 'exercise' | 'message' | 'system';
  data?: any;
}

interface NotificationsStore {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;

  unreadCount: number;

  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  setNotifications: (notifications) => {
    const sorted = notifications.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    set({ notifications: sorted });
  },

  get unreadCount() {
    return get().notifications.filter((n) => !n.read).length;
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: `notif_${Date.now()}`, read: false },
        ...state.notifications,
      ],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));

// ============================================
// Professional Store (for Professionals)
// ============================================

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  cpf?: string;
}

interface ProfessionalStore {
  // Patient list
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;

  // Selected patient
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;

  // Exercise templates
  exerciseTemplates: Exercise[];
  setExerciseTemplates: (templates: Exercise[]) => void;

  // Stats
  stats: {
    totalPatients: number;
    activePlans: number;
    sessionsThisMonth: number;
  };
  setStats: (stats: ProfessionalStore['stats']) => void;
}

export const useProfessionalStore = create<ProfessionalStore>((set) => ({
  patients: [],
  setPatients: (patients) => set({ patients }),

  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),

  exerciseTemplates: [],
  setExerciseTemplates: (templates) => set({ exerciseTemplates: templates }),

  stats: {
    totalPatients: 0,
    activePlans: 0,
    sessionsThisMonth: 0,
  },
  setStats: (stats) => set({ stats }),
}));

// Export all stores
export const stores = {
  auth: useAuthStore,
  app: useAppStore,
  exercises: useExercisesStore,
  pain: usePainStore,
  appointments: useAppointmentsStore,
  notifications: useNotificationsStore,
  professional: useProfessionalStore,
};
