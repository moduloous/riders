import type { Delivery } from '../types/delivery';
import StatusBadge from './StatusBadge';

interface DeliveryCardProps {
  delivery: Delivery;
  onNavigate: () => void;
}

export default function DeliveryCard({ delivery, onNavigate }: DeliveryCardProps) {
  const shortId = delivery.orderId.slice(-6).toUpperCase();

  return (
    <div
      className="card cursor-pointer transition-all duration-200 hover:border-[#6C63FF]/50 active:scale-[0.99]"
      style={{ borderColor: 'rgba(108, 99, 255, 0.3)' }}
      onClick={onNavigate}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #6C63FF22, #5A52D522)', border: '1px solid #6C63FF44' }}>
            <svg className="w-4 h-4 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <span className="font-bold text-white text-base">#{shortId}</span>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      {/* Pickup & Drop mini-route */}
      <div className="flex gap-3 mb-4">
        <div className="flex flex-col items-center pt-1.5">
          <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
          <div className="w-px flex-1 bg-[#374151] my-1" />
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
        </div>
        <div className="flex-1 space-y-2.5">
          <div>
            <p className="text-white text-sm font-medium leading-tight">{delivery.pharmacy.name}</p>
            <p className="text-[#9CA3AF] text-xs line-clamp-1">{delivery.pickupAddress}</p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs line-clamp-1">{delivery.dropAddress}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {delivery.distanceKm ? (
          <span className="text-xs text-[#6B7280]">{delivery.distanceKm.toFixed(1)} km</span>
        ) : <span />}
        <span className="text-xs font-semibold text-[#6C63FF] flex items-center gap-1">
          View Delivery
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
