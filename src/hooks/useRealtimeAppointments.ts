/**
 * Realtime Appointments Hook
 *
 * Subscribes to Supabase Realtime for appointment changes.
 * Provides instant updates when appointments are created, updated, or deleted.
 *
 * Features:
 * - Live appointment updates
 * - Presence tracking for therapists
 * - Conflict detection
 * - Multi-room support
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AppointmentEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface AppointmentChange {
  eventType: AppointmentEvent;
  old?: Appointment;
  new?: Appointment;
}

export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TherapistPresence {
  therapistId: string;
  therapistName: string;
  online: boolean;
  lastSeen: string;
  currentRoom?: string;
}

export interface UseRealtimeAppointmentsOptions {
  therapistId?: string;
  patientId?: string;
  enabled?: boolean;
  onAppointmentChange?: (change: AppointmentChange) => void;
  onTherapistPresence?: (therapists: TherapistPresence[]) => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimeAppointmentsResult {
  connected: boolean;
  presence: TherapistPresence[];
  subscribe: () => void;
  unsubscribe: () => void;
  trackPresence: (online: boolean) => void;
}

// ============================================================================
// PRESENCE STATE SYNC
// ============================================================================

// Shared presence state across all hook instances
let presenceChannel: RealtimeChannel | null = null;
let presenceSubscribers = 0;
const localPresenceState = {
  online: false,
  therapistId: null as string | null,
  therapistName: null as string | null,
};

// ============================================================================
// REALTIME APPOINTMENTS HOOK
// ============================================================================

export function useRealtimeAppointments(
  options: UseRealtimeAppointmentsOptions = {}
): UseRealtimeAppointmentsResult {
  const {
    therapistId,
    patientId,
    enabled = true,
    onAppointmentChange,
    onTherapistPresence,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<TherapistPresence[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Subscribe to appointment changes
   */
  const subscribe = useCallback(() => {
    if (!enabled) return;

    const channelName = therapistId
      ? `appointments:therapist=${therapistId}`
      : patientId
      ? `appointments:patient=${patientId}`
      : 'appointments:all';

    logger.info('Subscribing to realtime appointments', { channelName }, 'useRealtimeAppointments');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: therapistId
            ? `therapist_id=eq.${therapistId}`
            : patientId
            ? `patient_id=eq.${patientId}`
            : undefined,
        },
        (payload) => {
          logger.debug('Appointment change received', { payload }, 'useRealtimeAppointments');

          const change: AppointmentChange = {
            eventType: payload.eventType as AppointmentEvent,
            old: payload.old as Appointment | undefined,
            new: payload.new as Appointment | undefined,
          };

          onAppointmentChange?.(change);

          // If appointment is for current patient/therapist, invalidate queries
          if (payload.new || payload.old) {
            const appointment = (payload.new || payload.old) as Appointment;

            // Trigger cache invalidation
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('appointment-change', { detail: change }));
            }
          }
        }
      )
      .subscribe((status) => {
        logger.info('Realtime subscription status', { status, channelName }, 'useRealtimeAppointments');

        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    channelRef.current = channel;
  }, [enabled, therapistId, patientId, onAppointmentChange]);

  /**
   * Unsubscribe from changes
   */
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      logger.info('Unsubscribing from realtime appointments', {}, 'useRealtimeAppointments');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }
  }, []);

  /**
   * Track presence (online/offline)
   */
  const trackPresence = useCallback(
    async (online: boolean) => {
      if (!therapistId) {
        logger.warn('Cannot track presence without therapistId', {}, 'useRealtimeAppointments');
        return;
      }

      // Update local state
      localPresenceState.online = online;
      localPresenceState.therapistId = therapistId;

      // Get therapist name from profile
      if (!localPresenceState.therapistName) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, name')
          .eq('id', therapistId)
          .single();

        localPresenceState.therapistName = data?.full_name || data?.name || 'Terapeuta';
      }

      // Sync presence channel
      await syncPresenceChannel();

      // Update presence state
      if (presenceChannel && online) {
        await presenceChannel.track({
          online: true,
          therapist_id: therapistId,
          therapist_name: localPresenceState.therapistName,
          last_seen: new Date().toISOString(),
        });
      } else if (presenceChannel && !online) {
        await presenceChannel.untrack();
      }
    },
    [therapistId]
  );

  // Subscribe on mount
  useEffect(() => {
    if (enabled) {
      subscribe();

      return () => {
        unsubscribe();
      };
    }
  }, [enabled, subscribe, unsubscribe]);

  // Track presence on mount/unmount
  useEffect(() => {
    if (enabled && therapistId) {
      trackPresence(true);

      return () => {
        trackPresence(false);
      };
    }
  }, [enabled, therapistId]);

  // Listen for page visibility changes to track presence
  useEffect(() => {
    if (!therapistId) return;

    const handleVisibilityChange = () => {
      trackPresence(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [therapistId, trackPresence]);

  return {
    connected,
    presence,
    subscribe,
    unsubscribe,
    trackPresence,
  };
}

// ============================================================================
// PRESENCE CHANNEL MANAGEMENT
// ============================================================================

/**
 * Sync the shared presence channel
 */
async function syncPresenceChannel() {
  if (!presenceChannel) {
    presenceChannel = supabase.channel('therapist-presence', {
      config: {
        presence: {
          key: localPresenceState.therapistId || 'unknown',
        },
      },
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel?.presenceState<TherapistPresence>();
      if (state) {
        const therapists: TherapistPresence[] = [];

        for (const [id, presences] of Object.entries(state)) {
          for (const presence of presences) {
            therapists.push({
              therapistId: id,
              therapistName: presence.therapist_name || 'Terapeuta',
              online: presence.online ?? false,
              lastSeen: presence.last_seen || new Date().toISOString(),
              currentRoom: presence.current_room,
            });
          }
        }

        // Dispatch presence update event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('therapist-presence', { detail: therapists }));
        }
      }
    });

    await presenceChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        presenceSubscribers++;
      }
    });
  }
}

// ============================================================================
// MULTI-CLIENT REALTIME HOOK
// ============================================================================

export interface UseMultiClientRealtimeOptions {
  enabled?: boolean;
  onAppointmentChange?: (change: AppointmentChange) => void;
  onConflict?: (conflict: AppointmentChange[]) => void;
}

/**
 * Hook for multiple users (e.g., admin dashboard viewing all appointments)
 */
export function useMultiClientRealtime(
  options: UseMultiClientRealtimeOptions = {}
) {
  const { enabled = true, onAppointmentChange, onConflict } = options;
  const [connected, setConnected] = useState(false);
  const [recentChanges, setRecentChanges] = useState<AppointmentChange[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('appointments:all-clients')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const change: AppointmentChange = {
            eventType: payload.eventType as AppointmentEvent,
            old: payload.old as Appointment | undefined,
            new: payload.new as Appointment | undefined,
          };

          // Add to recent changes
          setRecentChanges((prev) => [change, ...prev].slice(0, 10));

          onAppointmentChange?.(change);

          // Check for conflicts (rapid changes to same appointment)
          setRecentChanges((prev) => {
            const conflicts = prev.filter(
              (c) =>
                c.new?.id === change.new?.id &&
                c.eventType === 'UPDATE' &&
                change.eventType === 'UPDATE'
            );

            if (conflicts.length > 0) {
              onConflict?.([change, ...conflicts]);
            }

            return prev;
          });
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onAppointmentChange, onConflict]);

  return {
    connected,
    recentChanges,
    clearChanges: () => setRecentChanges([]),
  };
}

// ============================================================================
// APPOINTMENT ROOM HOOK
// ============================================================================

export interface UseAppointmentRoomOptions {
  appointmentId: string;
  enabled?: boolean;
  onJoin?: (userId: string) => void;
  onLeave?: (userId: string) => void;
}

/**
 * Hook for real-time collaboration within an appointment room
 */
export function useAppointmentRoom(
  options: UseAppointmentRoomOptions
) {
  const { appointmentId, enabled = true, onJoin, onLeave } = options;
  const [participants, setParticipants] = useState<string[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);

  useEffect(() => {
    if (!enabled || !appointmentId) return;

    const channel = supabase.channel(`appointment:${appointmentId}`, {
      config: {
        presence: {
          key: 'user',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state);
        setParticipants(users);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        onJoin?.(key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        onLeave?.(key);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsInRoom(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsInRoom(false);
    };
  }, [appointmentId, enabled, onJoin, onLeave]);

  return {
    participants,
    isInRoom,
    participantCount: participants.length,
  };
}

// ============================================================================
// REALTIME APPOINTMENTS CONTEXT (for global state)
// ============================================================================

import { createContext, useContext as useContextHook, ReactNode } from 'react';

interface RealtimeContextValue {
  connected: boolean;
  presence: TherapistPresence[];
  trackPresence: (online: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<TherapistPresence[]>([]);

  useEffect(() => {
    // Listen for presence updates from any hook instance
    const handlePresenceUpdate = (e: CustomEvent<TherapistPresence[]>) => {
      setPresence(e.detail);
    };

    window.addEventListener('therapist-presence', handlePresenceUpdate as EventListener);

    return () => {
      window.removeEventListener('therapist-presence', handlePresenceUpdate as EventListener);
    };
  }, []);

  const trackPresence = useCallback(async (online: boolean) => {
    localPresenceState.online = online;
    await syncPresenceChannel();

    if (presenceChannel && online) {
      await presenceChannel.track({
        online: true,
        last_seen: new Date().toISOString(),
      });
    } else if (presenceChannel && !online) {
      await presenceChannel.untrack();
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected, presence, trackPresence }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContextHook(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return context;
}
