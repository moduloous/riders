// ─── Rider ───────────────────────────────────────────────────────────
export type RiderStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY';

export interface RiderProfile {
  id: string;
  userId: string;
  vehicleType: 'BIKE' | 'AUTO' | 'MINI' | 'SEDAN' | 'SUV';
  vehicleNumber: string;
  status: RiderStatus;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentHeading: number | null;
  currentSpeed: number | null;
  lastLocationAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    avatar: string | null;
  };
}

export interface UpdateStatusPayload {
  /** Must be OFFLINE or AVAILABLE — ON_DELIVERY is controlled by the backend lifecycle */
  status: 'OFFLINE' | 'AVAILABLE';
}
