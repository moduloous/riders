import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentDelivery, updateStatus } from '../services/riderService';
import { useRiderLocation } from '../hooks/useRiderLocation';
import type { Delivery } from '../types/delivery';
import type { RiderStatus } from '../types/rider';
import DeliveryCard from '../components/DeliveryCard';
import StatusBadge from '../components/StatusBadge';

const POLL_INTERVAL_MS = 15000; // poll every 15 seconds

export default function DashboardPage() {
  const { rider, logout, updateRider, token } = useAuth();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDelivery = useCallback(async () => {
    try {
      const d = await getCurrentDelivery();
      setDelivery(d);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load delivery.');
    } finally {
      setDeliveryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(fetchDelivery, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDelivery]);

  // Keep location tracking alive while waiting on the dashboard
  useRiderLocation(
    delivery?.id,
    delivery?.status,
    rider?.status,
    token,
    fetchDelivery
  );

  async function handleToggleStatus() {
    if (!rider) return;
    // Prevent toggling if rider is ON_DELIVERY (backend controls that)
    if (rider.status === 'ON_DELIVERY') return;

    const newStatus: RiderStatus = rider.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    setStatusLoading(true);
    setActionError(null);
    try {
      const updated = await updateStatus({ status: newStatus as 'OFFLINE' | 'AVAILABLE' });
      updateRider({ ...rider, status: updated.status });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const riderName = rider?.user?.name || rider?.user?.phone || 'Rider';
  const status = rider?.status || 'OFFLINE';

  return (
    <div className="min-h-screen px-4 pb-10 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52D5)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Nexor Rider</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-[#9CA3AF] hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-[#1F2937]"
        >
          Logout
        </button>
      </div>

      {/* Rider Status Card */}
      <div className="card mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[#9CA3AF] text-xs font-medium mb-0.5 uppercase tracking-wide">Rider</p>
            <p className="text-white font-semibold text-lg leading-tight">{riderName}</p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="flex-shrink-0">
            {status === 'ON_DELIVERY' ? (
              <span className="text-xs text-[#6B7280] bg-[#374151] px-3 py-2 rounded-xl font-medium">
                On Delivery
              </span>
            ) : (
              <button
                onClick={handleToggleStatus}
                disabled={statusLoading}
                className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                  status === 'AVAILABLE'
                    ? 'bg-[#1F2937] border border-[#374151] text-[#9CA3AF] hover:border-[#EF4444] hover:text-[#EF4444]'
                    : 'text-white'
                }`}
                style={status === 'OFFLINE' ? {
                  background: 'linear-gradient(135deg, #6C63FF, #5A52D5)',
                  boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
                } : {}}
              >
                {statusLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ...
                  </span>
                ) : status === 'AVAILABLE' ? 'Go Offline' : 'Go Online'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="mt-3 text-sm text-red-400 bg-red-950/40 rounded-xl p-2.5">{actionError}</p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Deliveries', value: '—' },
          { label: 'Completed', value: '—' },
          { label: 'Earnings', value: '₹—' },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center py-4">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Current Delivery */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
          Current Delivery
        </p>

        {deliveryLoading ? (
          <div className="card space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-10 w-full mt-2" />
          </div>
        ) : error ? (
          <div className="card text-center py-6">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchDelivery}
              className="mt-3 text-sm text-[#6C63FF] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : delivery ? (
          <DeliveryCard delivery={delivery} onNavigate={() => navigate(`/delivery/${delivery.id}`)} />
        ) : (
          <div className="card text-center py-10">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#374151]">
              <svg className="w-7 h-7 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <p className="text-white font-semibold">No active deliveries</p>
            <p className="text-[#9CA3AF] text-sm mt-1 max-w-48 mx-auto">
              {status === 'AVAILABLE'
                ? "You'll receive a delivery when one is assigned."
                : 'Go online to start receiving deliveries.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
