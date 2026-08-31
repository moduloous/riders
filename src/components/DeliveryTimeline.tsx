import type { Delivery, DeliveryStatus } from '../types/delivery';

interface DeliveryTimelineProps {
  currentStatus: DeliveryStatus;
  delivery: Delivery;
}

const STEPS: Array<{ status: DeliveryStatus; label: string; time: (d: Delivery) => string | null }> = [
  { status: 'ASSIGNED',         label: 'Assigned',         time: (d) => d.assignedAt },
  { status: 'ACCEPTED',         label: 'Accepted',         time: (d) => d.acceptedAt },
  { status: 'RIDER_AT_PICKUP',  label: 'Arrived at Pickup', time: (d) => d.arrivedAtPickupAt },
  { status: 'PICKED_UP',        label: 'Picked Up',        time: (d) => d.pickedUpAt },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', time: (d) => d.startedDeliveryAt },
  { status: 'DELIVERED',        label: 'Delivered',        time: (d) => d.deliveredAt },
];

const STATUS_ORDER: DeliveryStatus[] = [
  'ASSIGNED', 'ACCEPTED', 'RIDER_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function DeliveryTimeline({ currentStatus, delivery }: DeliveryTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const stepIndex = STATUS_ORDER.indexOf(step.status);
        const isDone = stepIndex < currentIndex;
        const isCurrent = stepIndex === currentIndex;
        const time = formatTime(step.time(delivery));
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isDone ? 'bg-[#10B981]' :
                  isCurrent ? 'bg-[#6C63FF]' :
                  'bg-[#374151]'
                }`}
                style={isCurrent ? { boxShadow: '0 0 12px rgba(108,99,255,0.5)' } : {}}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 ${isDone ? 'bg-[#10B981]' : 'bg-[#374151]'}`}
                  style={{ minHeight: 24 }}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-5">
              <p className={`text-sm font-medium leading-none ${
                isCurrent ? 'text-white' :
                isDone ? 'text-[#10B981]' :
                'text-[#6B7280]'
              }`}>
                {step.label}
                {isCurrent && (
                  <span className="ml-2 text-xs text-[#6C63FF] font-normal">← Current</span>
                )}
              </p>
              {time && (
                <p className="text-xs text-[#6B7280] mt-0.5">{time}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
