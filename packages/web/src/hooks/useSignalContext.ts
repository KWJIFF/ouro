'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * Signal Context Hook
 * 
 * Captures ambient context for richer signal metadata:
 * - Device info (mobile/desktop, OS, browser)
 * - Time context (local time, timezone)
 * - Session tracking
 * - Network status
 * - Page visibility
 */

interface SignalContext {
  device: string;
  platform: string;
  browser: string;
  screenSize: string;
  timezone: string;
  localTime: string;
  sessionId: string;
  networkType: string;
  isVisible: boolean;
  language: string;
  touchCapable: boolean;
}

let sessionId: string | null = null;

function generateSessionId(): string {
  if (sessionId) return sessionId;
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return sessionId;
}

export function useSignalContext(): SignalContext {
  const [context, setContext] = useState<SignalContext>({
    device: 'unknown',
    platform: 'unknown',
    browser: 'unknown',
    screenSize: '0x0',
    timezone: 'UTC',
    localTime: new Date().toISOString(),
    sessionId: generateSessionId(),
    networkType: 'unknown',
    isVisible: true,
    language: 'en',
    touchCapable: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const platform = /Mac/i.test(ua) ? 'macOS' : /Win/i.test(ua) ? 'Windows' : /Linux/i.test(ua) ? 'Linux' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'unknown';
    const browser = /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : /Edge/i.test(ua) ? 'Edge' : 'unknown';

    const networkType = (navigator as any).connection?.effectiveType || 'unknown';

    setContext({
      device: isMobile ? 'mobile' : 'desktop',
      platform,
      browser,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localTime: new Date().toISOString(),
      sessionId: generateSessionId(),
      networkType,
      isVisible: document.visibilityState === 'visible',
      language: navigator.language || 'en',
      touchCapable: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    });

    // Track visibility
    const handleVisibility = () => {
      setContext(prev => ({ ...prev, isVisible: document.visibilityState === 'visible' }));
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Track resize
    const handleResize = () => {
      setContext(prev => ({ ...prev, screenSize: `${window.innerWidth}x${window.innerHeight}` }));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return context;
}
