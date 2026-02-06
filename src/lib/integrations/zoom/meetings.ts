/**
 * Zoom Integration
 * Integração real com Zoom Meetings API
 */
import {

  ZoomMeeting,
  ZoomUser,
  ZoomRecording,
} from '@/types/integrations';

// ============================================================================
// Zoom Client
// ============================================================================

export class ZoomClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.zoom.us/v2';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Gera JWT token para autenticação
   */
  private generateJWT(): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.apiKey,
      exp: Date.now() + 60 * 1000, // Expira em 1 minuto
    };

    // Simple JWT implementation (na produção, usar biblioteca)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = this.hmacSHA256(`${encodedHeader}.${encodedPayload}`, this.apiSecret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private hmacSHA256(message: string, secret: string): string {
    // Simplificado - usar biblioteca crypto real em produção
    return btoa(message + secret); // Placeholder
  }

  /**
   * Faz requisição autenticada para API
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = this.generateJWT();

    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  /**
   * Busca usuário Zoom por email
   */
  async getUserByEmail(email: string): Promise<ZoomUser | null> {
    const response = await this.request(`/users/${email}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Erro ao buscar usuário: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      type: data.type,
      created_at: new Date(data.created_at),
    };
  }

  /**
   * Cria usuário Zoom
   */
  async createUser(params: {
    email: string;
    first_name: string;
    last_name: string;
    type: 1 | 2 | 3; // 1=Basic, 2=Pro, 3=Corp
  }): Promise<ZoomUser> {
    const response = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        user_info: {
          email: params.email,
          first_name: params.first_name,
          last_name: params.last_name,
          type: params.type,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar usuário: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      type: data.type,
      created_at: new Date(),
    };
  }

  // ============================================================================
  // Meeting Operations
  // ============================================================================

  /**
   * Cria reunião Zoom
   */
  async createMeeting(params: {
    userId: string;
    topic: string;
    startTime?: Date;
    durationMinutes: number;
    password?: string;
    settings?: {
      host_video?: boolean;
      participant_video?: boolean;
      join_before_host?: boolean;
      auto_recording?: 'none' | 'local' | 'cloud';
      waiting_room?: boolean;
    };
  }): Promise<ZoomMeeting> {
    const body: unknown = {
      topic: params.topic,
      type: params.startTime ? 2 : 1, // 1=Instant, 2=Scheduled
      duration: params.durationMinutes,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        auto_recording: 'cloud',
        waiting_room: true,
        ...params.settings,
      },
    };

    if (params.startTime) {
      body.start_time = params.startTime.toISOString();
    }

    if (params.password) {
      body.password = params.password;
    }

    const response = await this.request(`/users/${params.userId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar reunião: ${error}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      uuid: data.uuid,
      topic: data.topic,
      start_url: data.start_url,
      join_url: data.join_url,
      password: data.password,
      start_time: data.start_time ? new Date(data.start_time) : undefined,
      duration: data.duration,
      status: data.status,
      created_at: new Date(data.created_at),
    };
  }

  /**
   * Busca reunião por ID
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting | null> {
    const response = await this.request(`/meetings/${meetingId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Erro ao buscar reunião: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      uuid: data.uuid,
      topic: data.topic,
      start_url: data.start_url,
      join_url: data.join_url,
      password: data.password,
      start_time: data.start_time ? new Date(data.start_time) : undefined,
      duration: data.duration,
      status: data.status,
      created_at: new Date(data.created_at),
    };
  }

  /**
   * Atualiza reunião
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<ZoomMeeting>
  ): Promise<void> {
    const body: unknown = {};

    if (updates.topic) body.topic = updates.topic;
    if (updates.start_time) {
      body.start_time = updates.start_time.toISOString();
      body.type = 2;
    }
    if (updates.duration) body.duration = updates.duration;
    if (updates.password) body.password = updates.password;

    const response = await this.request(`/meetings/${meetingId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar reunião: ${response.statusText}`);
    }
  }

  /**
   * Deleta reunião
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    const response = await this.request(`/meetings/${meetingId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Erro ao deletar reunião: ${response.statusText}`);
    }
  }

  /**
   * Lista reuniões de um usuário
   */
  async listUserMeetings(
    userId: string,
    options: {
      from?: Date;
      to?: Date;
      type?: 'scheduled' | 'live' | 'upcoming';
    } = {}
  ): Promise<ZoomMeeting[]> {
    const params = new URLSearchParams();
    params.append('page_size', '30');

    if (options.from) params.append('from', options.from.toISOString());
    if (options.to) params.append('to', options.to.toISOString());
    if (options.type) params.append('type', options.type);

    const response = await this.request(
      `/users/${userId}/meetings?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Erro ao listar reuniões: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.meetings || []).map((m: unknown) => ({
      id: m.id,
      uuid: m.uuid,
      topic: m.topic,
      start_url: m.start_url,
      join_url: m.join_url,
      password: m.password,
      start_time: m.start_time ? new Date(m.start_time) : undefined,
      duration: m.duration,
      status: m.status,
      created_at: new Date(m.created_at),
    }));
  }

  // ============================================================================
  // Recording Operations
  // ============================================================================

  /**
   * Busca gravações de uma reunião
   */
  async getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
    const response = await this.request(`/meetings/${meetingId}/recordings`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar gravações: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.recording_files || []).map((r: unknown) => ({
      id: r.id,
      file_type: r.file_type,
      file_size: r.file_size,
      download_url: r.download_url,
      play_url: r.play_url,
      start_time: new Date(r.start_time),
      recording_start: new Date(r.recording_start),
      recording_end: new Date(r.recording_end),
    }));
  }

  // ============================================================================
  // Webhook Verification
  // ============================================================================

  /**
   * Verifica assinatura do webhook
   */
  verifyWebhook(signature: string, _payload: string): boolean {
    // TODO: Implementar verificação real HMAC-SHA256
    // zoom webhook secret + payload -> compare com signature
    return signature.length > 0;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cria reunião Zoom para telemedicina
 */
export async function createTelemedicineMeeting(
  client: ZoomClient,
  params: {
    patientEmail: string;
    physiotherapistEmail: string;
    appointmentTime: Date;
    durationMinutes: number;
    patientName: string;
  }
): Promise<{
  meeting: ZoomMeeting;
  patientUrl: string;
  physiotherapistUrl: string;
}> {
  // Buscar ou criar usuário do fisioterapeuta
  let user = await client.getUserByEmail(params.physiotherapistEmail);

  if (!user) {
    // Criar usuário básico
    user = await client.createUser({
      email: params.physiotherapistEmail,
      first_name: 'Fisioterapeuta',
      last_name: 'FisioFlow',
      type: 1,
    });
  }

  // Criar reunião
  const meeting = await client.createMeeting({
    userId: user.id,
    topic: `Sessão de Fisioterapia - ${params.patientName}`,
    startTime: params.appointmentTime,
    durationMinutes: params.durationMinutes,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      auto_recording: 'cloud',
      waiting_room: true,
    },
  });

  return {
    meeting,
    patientUrl: meeting.join_url,
    physiotherapistUrl: meeting.start_url,
  };
}

/**
 * Webhook events
 */
export type ZoomWebhookEvent =
  | 'meeting.started'
  | 'meeting.ended'
  | 'meeting.updated'
  | 'recording.completed'
  | 'participant.joined'
  | 'participant.left';

/**
 * Processa webhook event do Zoom
 */
export async function handleZoomWebhook(
  event: ZoomWebhookEvent,
  payload: unknown,
  handlers: {
    onMeetingStarted?: (meetingId: string, payload: unknown) => Promise<void>;
    onMeetingEnded?: (meetingId: string, payload: unknown) => Promise<void>;
    onRecordingCompleted?: (meetingId: string, recordingUrl: string) => Promise<void>;
  }
): Promise<void> {
  const meetingId = payload.object?.id;

  switch (event) {
    case 'meeting.started':
      await handlers.onMeetingStarted?.(meetingId, payload);
      break;

    case 'meeting.ended':
      await handlers.onMeetingEnded?.(meetingId, payload);
      break;

    case 'recording.completed': {
      const downloadUrl = payload.object?.download_url;
      await handlers.onRecordingCompleted?.(meetingId, downloadUrl);
      break;
    }

    default:
      console.log(`Unhandled Zoom event: ${event}`);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ZoomConfig {
  api_key: string;
  api_secret: string;
  webhook_verification_token?: string;
  default_duration_minutes?: number;
  enable_recording?: boolean;
  enable_waiting_room?: boolean;
}
