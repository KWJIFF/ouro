'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface ExecutionEvent {
  type: 'parsed' | 'planned' | 'step_started' | 'step_completed' | 'step_failed' | 'completed' | 'evolution';
  data: any;
}

export function useWebSocket(signalId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);

  useEffect(() => {
    const socket = io(WS_URL, { path: '/ws', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => { setConnected(true); });
    socket.on('disconnect', () => { setConnected(false); });

    // Subscribe to all execution events
    socket.on('signal:parsed', (data) => setEvents(e => [...e, { type: 'parsed', data }]));
    socket.on('execution:planned', (data) => setEvents(e => [...e, { type: 'planned', data }]));
    socket.on('step:started', (data) => setEvents(e => [...e, { type: 'step_started', data }]));
    socket.on('step:completed', (data) => setEvents(e => [...e, { type: 'step_completed', data }]));
    socket.on('step:failed', (data) => setEvents(e => [...e, { type: 'step_failed', data }]));
    socket.on('execution:completed', (data) => setEvents(e => [...e, { type: 'completed', data }]));
    socket.on('evolution:occurred', (data) => setEvents(e => [...e, { type: 'evolution', data }]));

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (signalId && socketRef.current) {
      socketRef.current.emit('subscribe:signal', signalId);
    }
  }, [signalId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { connected, events, clearEvents };
}
