'use client';
import { useState, useRef, useCallback } from 'react';

/**
 * Media Capture Hooks
 * 
 * Provides voice recording, camera capture, and screen capture
 * with proper error handling and browser compatibility.
 */

// === Voice Recording ===
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.onerror = (e: any) => {
        setError(`Recording error: ${e.error?.message || 'unknown'}`);
        setIsRecording(false);
      };

      recorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setAudioBlob(null);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, []);

  return { isRecording, audioBlob, duration, error, startRecording, stopRecording, clearRecording };
}

// === Camera Capture ===
export function useCameraCapture() {
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async (facingMode: 'user' | 'environment' = 'environment'): Promise<Blob | null> => {
    try {
      setError(null);
      setCapturing(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          setCapturing(false);
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    } catch (err: any) {
      setCapturing(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      return null;
    }
  }, []);

  return { capture, capturing, error };
}

// === Screen Capture ===
export function useScreenCapture() {
  const [error, setError] = useState<string | null>(null);

  const captureScreen = useCallback(async (): Promise<Blob | null> => {
    try {
      setError(null);
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Screen capture was cancelled.');
      } else {
        setError(`Screen capture error: ${err.message}`);
      }
      return null;
    }
  }, []);

  return { captureScreen, error };
}
