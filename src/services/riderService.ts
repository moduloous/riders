import apiClient from './api';
import type { AuthResponse, LoginPayload } from '../types/auth';
import type { RiderProfile, UpdateStatusPayload } from '../types/rider';
import type { Delivery } from '../types/delivery';

// ─── Auth ─────────────────────────────────────────────────────────────

/**
 * POST /api/delivery/riders/auth
 * Authenticate using a Firebase ID token. Backend verifies the token,
 * finds or creates the User, then checks for a Rider record.
 * Throws 403 if the authenticated user is not a registered rider.
 */
export async function authenticateRider(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/delivery/riders/auth', payload);
  return res.data;
}

// ─── Rider Profile ─────────────────────────────────────────────────────

/**
 * GET /api/delivery/riders/me
 * Returns the full rider profile including user info.
 * Requires: Bearer JWT
 */
export async function getProfile(): Promise<RiderProfile> {
  const res = await apiClient.get<RiderProfile>('/delivery/riders/me');
  return res.data;
}

/**
 * PATCH /api/delivery/riders/status
 * Update rider status. Frontend should only send OFFLINE or AVAILABLE.
 * ON_DELIVERY is managed by the backend delivery lifecycle.
 * Requires: Bearer JWT
 */
export async function updateStatus(payload: UpdateStatusPayload): Promise<RiderProfile> {
  const res = await apiClient.patch<RiderProfile>('/delivery/riders/status', payload);
  return res.data;
}

// ─── Current Delivery ──────────────────────────────────────────────────

/**
 * GET /api/delivery/riders/current-delivery
 * Returns the active delivery (ASSIGNED → OUT_FOR_DELIVERY) or null.
 * Requires: Bearer JWT
 */
export async function getCurrentDelivery(): Promise<Delivery | null> {
  const res = await apiClient.get<Delivery | null>('/delivery/riders/current-delivery');
  return res.data;
}

// ─── Delivery Lifecycle ────────────────────────────────────────────────

/**
 * POST /api/delivery/riders/deliveries/:id/accept
 * Valid from: ASSIGNED → ACCEPTED
 * Side-effect: sets RiderStatus = ON_DELIVERY
 */
export async function acceptDelivery(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/accept`);
  return res.data;
}

/**
 * POST /api/delivery/riders/deliveries/:id/reject
 * Valid from: ASSIGNED only
 * Side-effect: clears riderId, triggers reassignment
 */
export async function rejectDelivery(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/reject`);
  return res.data;
}

/**
 * POST /api/delivery/riders/deliveries/:id/arrived
 * Valid from: ACCEPTED → RIDER_AT_PICKUP
 */
export async function arriveAtPickup(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/arrived`);
  return res.data;
}

/**
 * POST /api/delivery/riders/deliveries/:id/pickup
 * Valid from: RIDER_AT_PICKUP → PICKED_UP
 * Side-effect: syncs MedOrder → OUT_FOR_DELIVERY
 */
export async function confirmPickup(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/pickup`);
  return res.data;
}

/**
 * POST /api/delivery/riders/deliveries/:id/start
 * Valid from: PICKED_UP → OUT_FOR_DELIVERY
 */
export async function startDelivery(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/start`);
  return res.data;
}

/**
 * POST /api/delivery/riders/deliveries/:id/delivered
 * Valid from: OUT_FOR_DELIVERY → DELIVERED
 * Side-effect: sets RiderStatus = AVAILABLE, syncs MedOrder → DELIVERED
 */
export async function completeDelivery(deliveryId: string): Promise<Delivery> {
  const res = await apiClient.post<Delivery>(`/delivery/riders/deliveries/${deliveryId}/delivered`);
  return res.data;
}
