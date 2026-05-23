import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { GeminiService, ExtractedWineData } from '../../core/services/GeminiService';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onScanComplete: (data: ExtractedWineData, imageBase64: string) => void;
  onRedirectToSettings: () => void;
}

const geminiService = new GeminiService();

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onScanComplete,
  onRedirectToSettings
}) => {
  const { stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  // Auto-route to settings if API key is missing
  useEffect(() => {
    if (isOpen && !apiKey) {
      onRedirectToSettings();
      onClose();
    }
  }, [isOpen, apiKey, onRedirectToSettings, onClose]);

  // Start/Stop camera stream
  useEffect(() => {
    if (isOpen && apiKey) {
      setScanError(null);
      setLoading(false);
      startCamera('environment').catch((err) => {
        setScanError("Kamerazugriff verweigert oder nicht verfügbar. Prüfe deine Browsereinstellungen.");
      });
    } else {
      stopCamera();
    }
  }, [isOpen, apiKey, startCamera, stopCamera]);

  // Bind media stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isOpen || !apiKey) return null;

  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    // Trigger visual camera flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 250);

    setLoading(true);
    setLoadingStatus('Foto wird verarbeitet...');
    setScanError(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not construct 2D context");

      // Original video dimensions
      const originalWidth = video.videoWidth || video.clientWidth;
      const originalHeight = video.videoHeight || video.clientHeight;

      // Downscale to max 600px width/height to optimize IndexedDB storage footprint!
      const maxDimension = 600;
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        if (originalWidth > originalHeight) {
          targetWidth = maxDimension;
          targetHeight = Math.round((originalHeight * maxDimension) / originalWidth);
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round((originalWidth * maxDimension) / originalHeight);
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw and scale frame
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Compress to JPEG with 0.7 quality
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

      setLoadingStatus('Sommelier-KI analysiert das Etikett...');
      
      // Analyze with Gemini
      const wineData = await geminiService.analyzeLabel(imageBase64, apiKey);
      
      // Successfully scanned! Call callback
      onScanComplete(wineData, imageBase64);
      onClose();
    } catch (err: any) {
      console.error("Scan analysis failed:", err);
      setScanError(err.message || "Etikett konnte nicht gelesen werden. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div className="bg-[#12080a] border border-white/10 p-6 rounded-3xl w-full max-w-xl relative overflow-hidden shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 z-50"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#f3e8eb] tracking-tight">Etiketten-Schnellscan</h2>
          <p className="text-xs text-gray-400">Positioniere das Weinetikett gut sichtbar im Kamerabild</p>
        </div>

        {/* Camera Display Box */}
        <div className={`relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 ${flash ? 'bg-white' : ''} transition-all`}>
          
          {/* Live Video Feed */}
          {stream && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Golden Animated Scanner Laser */}
          {stream && !loading && (
            <div className="scanner-laser" />
          )}

          {/* Error fallback inside camera box */}
          {(cameraError || scanError) && !loading && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-semibold text-red-400">
                {scanError || cameraError}
              </p>
              <button
                onClick={() => {
                  setScanError(null);
                  startCamera('environment');
                }}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-lg text-[#d4af37] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Camera Scanning Loading Overlay (High End Glassmorphism) */}
          {loading && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
              <div className="loading-ring w-12 h-12" />
              <p className="text-sm font-semibold text-[#f3e8eb] animate-pulse text-center px-6">
                {loadingStatus}
              </p>
            </div>
          )}

        </div>

        {/* Action Button Footer */}
        <div className="flex justify-between items-center mt-5 border-t border-white/5 pt-4">
          <p className="text-[10px] text-gray-500 max-w-[65%]">
            Kamera-Zugriff erfolgt verschlüsselt und lokal im Webbrowser. Bilder werden direkt auf dem Gerät verarbeitet.
          </p>
          <button
            onClick={handleCapture}
            disabled={loading || !stream}
            className="flex items-center gap-2 px-6 py-3 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_15px_rgba(140,28,46,0.3)] disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Foto aufnehmen
          </button>
        </div>

      </div>
    </div>
  );
};
