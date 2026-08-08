export enum AuthProvider {
  EMAIL = "email",
  GOOGLE = "google",
  APPLE = "apple",
}

export interface SocialLoginRequest {
  provider: AuthProvider;
  token: string;
  // Optional parameters that might be sent by mobile apps or web redirects
  redirectUri?: string;
  nonce?: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
  provider: AuthProvider;
  email?: string;
  role: string;
  organizationId?: string;
}

export interface AuthResponse {
  success: boolean;
  session?: AuthSession;
  error?: {
    code: string;
    message: string;
  };
}

export interface PatientPortalSession extends AuthSession {
  patientId: string;
  role: "patient";
}

// Common interface to represent standardized user data across web/mobile 
// after an OAuth callback is resolved
export interface SocialProfile {
  id: string; // The provider's unique ID for the user
  email: string;
  name?: string;
  picture?: string;
}
