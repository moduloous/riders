import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCurrentDelivery,
  acceptDelivery,
  rejectDelivery,
  arriveAtPickup,
  confirmPickup,
  startDelivery,
  completeDelivery,
} from '../services/riderService';
import { useAuth } from '../context/AuthContext';
import type { Delivery, DeliveryStatus } from '../types/delivery';
import StatusBadge from '../components/StatusBadge';
import DeliveryTimeline from '../components/DeliveryTimeline';
import { useRiderLocation } from '../hooks/useRiderLocation';

const POLL_INTERVAL_MS = 10000;

interface ActionConfig {
  label: string;
  variant: 'primary' | 'success' | 'danger';
  fn: (id: string) => Promise<Delivery>;
}

const ACTIONS: Partial<Record<DeliveryStatus, ActionConfig[]>> = {
  ASSIGNED: [
    { label: 'Accept Delivery', variant: 'primary', fn: acceptDelivery },
    { label: 'Reject', variant: 'danger', fn: rejectDelivery },
  ],
  ACCEPTED: [
    { label: "I've Arrived at Pickup", variant: 'primary', fn: arriveAtPickup },
  ],
  RIDER_AT_PICKUP: [
    { label: 'Confirm Pickup', variant: 'primary', fn: confirmPickup },
  ],
  PICKED_UP: [
    { label: 'Start Delivery Route', variant: 'primary', fn: startDelivery },
  ],
  OUT_FOR_DELIVERY: [
    { label: 'Complete Delivery ✓', variant: 'success', fn: completeDelivery },
  ],
};

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateRider, rider, token } = useAuth();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize tracking hook
  const locationState = useRiderLocation(id, delivery?.status, rider?.status, token);

  const fetchDelivery = useCallback(async () => {
    try {
      const d = await getCurrentDelivery();
      if (!d || d.id !== id) {
        // Delivery no longer active or doesn't belong to this rider
        setDelivery(null);
      } else {
        setDelivery(d);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load delivery.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(fetchDelivery, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDelivery]);

  async function handleAction(config: ActionConfig) {
    if (!id || !delivery) return;
    setActionLoading(config.label);
    setActionError(null);
    setSuccess(null);

    try {
      const updated = await config.fn(id);
      setDelivery(prev => prev ? { ...prev, ...updated } : prev);
      setSuccess(`✓ ${config.label} successful`);

      // If accepted, update the cached rider status
      if (delivery.status === 'ASSIGNED' && rider) {
        updateRider({ ...rider, status: 'ON_DELIVERY' });
      }
      // If delivered, update cached rider status back to AVAILABLE
      if (delivery.status === 'OUT_FOR_DELIVERY' && rider) {
        updateRider({ ...rider, status: 'AVAILABLE' });
        setTimeout(() => navigate('/dashboard'), 2000);
      }
      // If rejected, go back to dashboard
      if (delivery.status === 'ASSIGNED' && config.label === 'Reject') {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 pb-10 pt-6 max-w-lg mx-auto">
        <BackButton onClick={() => navigate('/dashboard')} />
        <div className="space-y-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen px-4 pb-10 pt-6 max-w-lg mx-auto">
        <BackButton onClick={() => navigate('/dashboard')} />
        <div className="card text-center py-12 mt-4">
          <p className="text-[#9CA3AF]">
            {error || 'This delivery is no longer active.'}
          </p>
          <button className="mt-4 text-sm text-[#6C63FF]" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const availableActions = ACTIONS[delivery.status] || [];
  const shortId = delivery.orderId.slice(-6).toUpperCase();

  return (
    <div className="min-h-screen px-4 pb-10 pt-6 max-w-lg mx-auto">
      <BackButton onClick={() => navigate('/dashboard')} />

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-5">
        <div>
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-1">Order</p>
          <h1 className="text-2xl font-bold text-white mb-2">#{shortId}</h1>
          
          {/* Location Tracking Indicator */}
          {locationState.status === 'active' && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/50 border border-emerald-800/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-medium text-emerald-300 uppercase tracking-wider">Location sharing: Active</span>
            </div>
          )}
          {locationState.status === 'denied' && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-950/50 border border-red-800/50">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-medium text-red-300 uppercase tracking-wider">Location sharing: Disabled (Denied)</span>
            </div>
          )}
          {locationState.status === 'error' && (
             <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-orange-950/50 border border-orange-800/50">
             <span className="h-2 w-2 rounded-full bg-orange-500" />
             <span className="text-[10px] font-medium text-orange-300 uppercase tracking-wider">Location sharing: Error</span>
           </div>
          )}
        </div>
        <StatusBadge status={delivery.status} large />
      </div>

      {/* Pickup & Drop */}
      <div className="card mb-4">
        <div className="flex gap-4">
          {/* Visual connector */}
          <div className="flex flex-col items-center pt-1">
            <div className="w-3 h-3 rounded-full bg-[#6C63FF] flex-shrink-0" />
            <div className="w-0.5 flex-1 bg-[#374151] my-1.5" />
            <div className="w-3 h-3 rounded-full bg-[#10B981] flex-shrink-0" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wide">Pickup</p>
              <p className="text-white font-semibold mt-0.5">{delivery.pharmacy.name}</p>
              <p className="text-[#9CA3AF] text-sm">{delivery.pickupAddress}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wide">Drop-off</p>
              <p className="text-white font-semibold mt-0.5">Customer</p>
              <p className="text-[#9CA3AF] text-sm">{delivery.dropAddress}</p>
            </div>
          </div>
        </div>

        {delivery.distanceKm && (
          <div className="mt-4 pt-4 border-t border-[#374151] flex gap-4">
            <Stat label="Distance" value={`${delivery.distanceKm.toFixed(1)} km`} />
            {delivery.estimatedMinutes && (
              <Stat label="Est. Time" value={`${delivery.estimatedMinutes} min`} />
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card mb-4">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-4">
          Delivery Progress
        </p>
        <DeliveryTimeline currentStatus={delivery.status} delivery={delivery} />
      </div>

      {/* Order items summary */}
      {delivery.order?.items?.length > 0 && (
        <div className="card mb-5">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Items</p>
          <div className="space-y-2">
            {delivery.order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#D1D5DB]">{item.medicine.name}</span>
                <span className="text-[#9CA3AF]">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success / Error feedback */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/50 rounded-xl p-3.5 mb-4">
          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 rounded-xl p-3.5 mb-4">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-300">{actionError}</p>
        </div>
      )}

      {/* Action Buttons */}
      {availableActions.length > 0 && (
        <div className="space-y-3">
          {availableActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action)}
              disabled={!!actionLoading}
              className={
                action.variant === 'success' ? 'btn-success' :
                action.variant === 'danger' ? 'btn-outline' :
                'btn-primary'
              }
            >
              {actionLoading === action.label ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Processing...
                </span>
              ) : action.label}
            </button>
          ))}
        </div>
      )}

      {delivery.status === 'DELIVERED' && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-white font-semibold">Delivery Complete!</p>
          <p className="text-[#9CA3AF] text-sm mt-1">Great job! You're now available.</p>
          <button
            className="mt-4 text-sm text-[#6C63FF] hover:underline"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[#9CA3AF] hover:text-white transition-colors py-1"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm">Dashboard</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#9CA3AF]">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  );
}
