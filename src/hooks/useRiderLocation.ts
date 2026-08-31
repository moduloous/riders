import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LocationState {
  status: 'inactive' | 'active' | 'denied' | 'unsupported' | 'error';
  errorMessage?: string;
}

export function useRiderLocation(
  deliveryId: string | undefined, 
  deliveryStatus: string | undefined, 
  riderStatus: string | undefined,
  accessToken: string | null,
  onDeliveryAssigned?: (delivery: any) => void
) {
  const [locationState, setLocationState] = useState<LocationState>({ status: 'inactive' });
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Check if we should track
    const activeDeliveryStatuses = ['ACCEPTED', 'RIDER_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
    const hasActiveDelivery = !!(deliveryId && deliveryStatus && activeDeliveryStatuses.includes(deliveryStatus));
    const shouldTrack = riderStatus === 'AVAILABLE' || riderStatus === 'ON_DELIVERY' || hasActiveDelivery;

    if (!shouldTrack || !accessToken) {
      // Cleanup
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setLocationState({ status: 'inactive' });
      return;
    }

    // 2. We should track. Initialize Socket.io connection if not already connected.
    if (!socketRef.current) {
      socketRef.current = io(`${import.meta.env.VITE_API_URL}/medicines/delivery`, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected for location tracking');
        socketRef.current?.emit('joinRiderRoom');
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });
      
      socketRef.current.on('delivery:assigned', (newDelivery) => {
        console.log('New delivery assigned received via WebSocket:', newDelivery);
        if (onDeliveryAssigned) {
          onDeliveryAssigned(newDelivery);
        }
      });
    }

    // 3. Initialize Geolocation watcher
    if ('geolocation' in navigator) {
      if (watchIdRef.current === null) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setLocationState({ status: 'active' });
            if (socketRef.current && socketRef.current.connected) {
              // Send location even if deliveryId is missing, allowing AVAILABLE riders to be found
              const payload: any = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || 0,
                speed: position.coords.speed || 0,
                timestamp: new Date(position.timestamp).toISOString(),
              };
              if (deliveryId) {
                payload.deliveryId = deliveryId;
              }
              socketRef.current.emit('rider:location:update', payload);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            if (error.code === error.PERMISSION_DENIED) {
              setLocationState({ status: 'denied', errorMessage: 'Location sharing is denied. Please enable location permissions.' });
            } else {
              setLocationState({ status: 'error', errorMessage: error.message });
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
          }
        );
      }
    } else {
      setLocationState({ status: 'unsupported', errorMessage: 'Geolocation is not supported by your browser.' });
    }

    return () => {
      // Cleanup handled explicitly on unmount below
    };
  }, [deliveryId, deliveryStatus, riderStatus, accessToken, onDeliveryAssigned]);

  // Handle explicit cleanup on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return locationState;
}
