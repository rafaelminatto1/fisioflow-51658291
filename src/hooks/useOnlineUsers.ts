/**
 * useOnlineUsers - Migrated to Neon/Workers
 */

import { useQuery } from '@tanstack/react-query';
import { auditApi, organizationMembersApi, type AuditLog, type OrganizationMember } from '@/lib/api/workers-client';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  userId: string;
  userName: string;
  role: string;
  joinedAt: Date;
  lastSeen: Date;
}

export interface PresenceState {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
}

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

function mapOnlineUsers(members: OrganizationMember[], logs: AuditLog[]): PresenceUser[] {
  const latestByUser = new Map<string, AuditLog>();

  logs.forEach((log) => {
    if (!log.user_id) return;
    const current = latestByUser.get(log.user_id);
    if (!current || new Date(log.created_at).getTime() > new Date(current.created_at).getTime()) {
      latestByUser.set(log.user_id, log);
    }
  });

  const now = Date.now();
  return members
    .filter((member) => member.active)
    .map((member) => {
      const latest = latestByUser.get(member.user_id);
      if (!latest) return null;
      const lastSeen = new Date(latest.created_at);
      if (now - lastSeen.getTime() > ONLINE_WINDOW_MS) return null;

      return {
        userId: member.user_id,
        userName: member.profiles?.full_name || member.profiles?.email || 'Usuário',
        role: member.role,
        joinedAt: lastSeen,
        lastSeen,
      } satisfies PresenceUser;
    })
    .filter((value): value is PresenceUser => value !== null)
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
}

export function useOnlineUsers(_channelName: string = 'online-users') {
  const { organizationId } = useAuth();

  const query = useQuery({
    queryKey: ['online-users', organizationId],
    queryFn: async (): Promise<PresenceState> => {
      if (!organizationId) {
        return { onlineUsers: [], isConnected: false };
      }

      const [membersRes, logsRes] = await Promise.all([
        organizationMembersApi.list({ organizationId, limit: 100 }),
        auditApi.list({ limit: 200 }),
      ]);

      const members = (membersRes?.data ?? []) as OrganizationMember[];
      const logs = (logsRes?.data ?? []) as AuditLog[];

      return {
        onlineUsers: mapOnlineUsers(members, logs),
        isConnected: true,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const state = query.data ?? { onlineUsers: [], isConnected: !!organizationId };

  return {
    onlineUsers: state.onlineUsers,
    isConnected: state.isConnected,
    onlineCount: state.onlineUsers.length,
  };
}

export function usePresence(channelName: string) {
  return useOnlineUsers(channelName);
}

export function useGlobalPresence() {
  return useOnlineUsers('global-online-users');
}
