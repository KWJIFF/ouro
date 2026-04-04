'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSignalStore } from '@/stores/signal-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface ExecutionEvent {
  type: string;
  data: any;
}

export function useWebSocket(signalId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const { setConnected: setStoreConnected, addExecutionEvent } = useSignalStore();

  useEffect(() => {
    const socket = io(WS_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setStoreConnected(true);
      console.log('[WS] Connected');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      setStoreConnected(false);
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('reconnect', (attempt) => {
      console.log('[WS] Reconnected after', attempt, 'attempts');
    });

    // Pipeline events
    const eventTypes = [
      'signal:parsed', 'signal:completed', 'signal:failed',
      'execution:planned', 'step:started', 'step:completed', 'step:failed',
      'execution:completed', 'artifact:created',
      'evolution:occurred', 'phase:transition',
    ];

    const eventTypeMap: Record<string, string> = {
      'signal:parsed': 'parsed',
      'signal:completed': 'completed',
      'signal:failed': 'failed',
      'execution:planned': 'planned',
      'step:started': 'step_started',
      'step:completed': 'step_completed',
      'step:failed': 'step_failed',
      'execution:completed': 'completed',
      'artifact:created': 'artifact',
      'evolution:occurred': 'evolution',
      'phase:transition': 'phase',
    };

    for (const eventType of eventTypes) {
      socket.on(eventType, (data: any) => {
        const event: ExecutionEvent = {
          type: eventTypeMap[eventType] || eventType,
          data,
        };
        setEvents(prev => [...prev, event]);
        addExecutionEvent({ ...event, timestamp: new Date().toISOString() });
      });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  // Subscribe to specific signal
  useEffect(() => {
    if (signalId && socketRef.current) {
      socketRef.current.emit('subscribe:signal', signalId);
    }
  }, [signalId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { connected, events, clearEvents };
}
