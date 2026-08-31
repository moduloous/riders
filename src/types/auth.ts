// ─── Auth ────────────────────────────────────────────────────────────
import type { RiderProfile } from './rider';
export interface AuthResponse {
  /** The Nexor JWT used for all subsequent authenticated requests */
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  rider: RiderProfile;
}

export interface LoginPayload {
  /** Firebase ID token obtained from phone-number OTP sign-in */
  idToken: string;
}
