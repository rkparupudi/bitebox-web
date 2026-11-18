import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, tokenStore } from '../api/client';
import type { OrderUpdate } from '../api/types';

/**
 * One Socket.IO connection per signed-in session, shared by every component.
 *
 * transports: ['websocket'] skips the HTTP long-polling fallback. That matters when the API
 * runs as several instances behind a load balancer: polling needs sticky sessions (every
 * request from a client must hit the same instance), a pure WebSocket does not.
 */
let socket: Socket | null = null;
let socketToken: string | null = null;

function getSocket(): Socket | null {
  const token = tokenStore.get();
  if (!token) return null;
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io(`${API_URL}/orders`, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

/**
 * Subscribe to live order updates. Each update refreshes the affected React Query data,
 * so screens re-render with the new status without polling. Returns whether the socket
 * is connected (shown as a small "Live" dot in the UI).
 */
export function useOrderUpdates(onUpdate?: (u: OrderUpdate) => void) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const handler = useRef(onUpdate);
  handler.current = onUpdate;

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onOrder = (u: OrderUpdate) => {
      queryClient.invalidateQueries({ queryKey: ['order', u.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders', u.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      handler.current?.(u);
    };
    setConnected(s.connected);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('order.updated', onOrder);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('order.updated', onOrder);
    };
  }, [queryClient]);

  return connected;
}
