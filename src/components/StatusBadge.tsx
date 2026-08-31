import type { RiderStatus } from '../types/rider';
import type { DeliveryStatus } from '../types/delivery';

type AnyStatus = RiderStatus | DeliveryStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  large?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  OFFLINE:            { label: 'Offline',            dot: '#6B7280', color: 'bg-[#374151] text-[#9CA3AF]' },
  AVAILABLE:          { label: 'Available',          dot: '#10B981', color: 'bg-emerald-950/60 text-emerald-300' },
  ON_DELIVERY:        { label: 'On Delivery',        dot: '#F59E0B', color: 'bg-amber-950/60 text-amber-300' },
  PENDING_ASSIGNMENT: { label: 'Pending',            dot: '#6B7280', color: 'bg-[#374151] text-[#9CA3AF]' },
  ASSIGNED:           { label: 'Assigned',           dot: '#6C63FF', color: 'bg-violet-950/60 text-violet-300' },
  ACCEPTED:           { label: 'Accepted',           dot: '#3B82F6', color: 'bg-blue-950/60 text-blue-300' },
  RIDER_AT_PICKUP:    { label: 'At Pickup',          dot: '#F59E0B', color: 'bg-amber-950/60 text-amber-300' },
  PICKED_UP:          { label: 'Picked Up',          dot: '#F59E0B', color: 'bg-amber-950/60 text-amber-300' },
  OUT_FOR_DELIVERY:   { label: 'Out for Delivery',   dot: '#3B82F6', color: 'bg-blue-950/60 text-blue-300' },
  DELIVERED:          { label: 'Delivered',          dot: '#10B981', color: 'bg-emerald-950/60 text-emerald-300' },
  REJECTED:           { label: 'Rejected',           dot: '#EF4444', color: 'bg-red-950/60 text-red-300' },
  CANCELLED:          { label: 'Cancelled',          dot: '#EF4444', color: 'bg-red-950/60 text-red-300' },
  FAILED:             { label: 'Failed',             dot: '#EF4444', color: 'bg-red-950/60 text-red-300' },
};

export default function StatusBadge({ status, large = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: '#6B7280', color: 'bg-[#374151] text-[#9CA3AF]' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${cfg.color} ${large ? 'text-xs px-3 py-1.5' : 'text-xs px-2.5 py-1'}`}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
      />
      {cfg.label}
    </span>
  );
}
