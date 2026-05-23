import { useState, useEffect, useCallback, useRef } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    setError(null);
    try {
      // Stop any existing stream first to avoid leaks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      const errMsg = "Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.";
      console.error("useCamera error:", err);
      setError(errMsg);
      throw new Error(errMsg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Cleanup stream on component unmount to prevent camera light remaining on!
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    error,
    startCamera,
    stopCamera
  };
}

