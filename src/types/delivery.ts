// ─── Delivery ────────────────────────────────────────────────────────
export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'RIDER_AT_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface MedOrderItem {
  id: string;
  medicineId: string;
  quantity: number;
  unitPrice: number;
  medicine: { id: string; name: string; };
}

export interface MedOrder {
  id: string;
  userId: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  status: string;
  createdAt: string;
  items: MedOrderItem[];
}

export interface Delivery {
  id: string;
  orderId: string;
  riderId: string | null;
  pharmacyId: string;
  status: DeliveryStatus;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  distanceKm: number | null;
  estimatedMinutes: number | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  arrivedAtPickupAt: string | null;
  pickedUpAt: string | null;
  startedDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  pharmacy: Pharmacy;
  order: MedOrder;
}
