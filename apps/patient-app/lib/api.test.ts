import { patientApi } from './api';
import { authClient } from './neonAuth';

type SessionFetchContext = {
  response?: {
    headers?: {
      get?: (name: string) => string | null;
    };
  };
};

jest.mock('./neonAuth', () => ({
  authClient: {
    getSession: jest.fn(),
  },
}));

jest.mock('./logger', () => ({
  log: {
    error: jest.fn(),
  },
}));

jest.mock('./mappers', () => ({
  Mappers: {
    patientProfile: jest.fn((value) => value),
    appointment: jest.fn((value) => value),
  },
}));

describe('patientApi route contracts', () => {
  const mockJsonResponse = (body: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (authClient.getSession as jest.Mock).mockImplementation(
      (options?: { fetchOptions?: { onSuccess?: (ctx: SessionFetchContext) => void } }) => {
        options?.fetchOptions?.onSuccess?.({
          response: {
            headers: {
              get: () => 'jwt-test-token',
            },
          },
        });

        return Promise.resolve({
          data: {
            session: {
              token: 'jwt-test-token',
            },
          },
        });
      },
    );
  });

  it('busca perfil no prefixo canônico do patient portal', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({ id: 'patient-1', name: 'Paciente Teste' }),
    );

    await patientApi.getProfile();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api-paciente.moocafisio.com.br/api/patient-portal/profile',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      }),
    );
  });

  it('envia confirmacao de consulta no endpoint correto do patient portal', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({ success: true }),
    );

    await patientApi.confirmAppointment('appt-123');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api-paciente.moocafisio.com.br/api/patient-portal/appointments/appt-123/confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });

  it('preserva query params no endpoint de appointments', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([]),
    );

    await patientApi.getAppointments(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api-paciente.moocafisio.com.br/api/patient-portal/appointments?upcoming=true',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });
});
