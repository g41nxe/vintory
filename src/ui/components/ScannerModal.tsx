import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { GeminiService, ExtractedWineData } from '../../core/services/GeminiService';
import { useVintory } from '../context/VintoryContext';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ExtractedWineData | null, imageBase64: string) => void;
  mode?: 'ocr' | 'photo-only';
}

const geminiService = new GeminiService();

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  mode = 'ocr'
}) => {
  const { stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Scanning States
  const [step, setStep] = useState<'front' | 'back'>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<{ front: string; back: string | null } | null>(null);
  
  const { addScanToQueue } = useVintory();
  
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  // Start/Stop camera stream
  useEffect(() => {
    if (isOpen) {
      setScanError(null);
      setLoading(false);
      setStep('front');
      setFrontImage(null);
      setFailedImages(null);
      
      startCamera('environment').catch(() => {
        setScanError("Kamerazugriff verweigert oder nicht verfügbar. Prüfe deine Browsereinstellungen.");
      });
    } else {
      stopCamera();
    }
  }, [isOpen, mode, startCamera, stopCamera]);

  // Bind media stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isOpen) return null;

  // Perform Gemini AI extraction with single or dual label images
  const runOCRAnalysis = async (frontImg: string, backImg: string | null) => {
    setLoading(true);
    setLoadingStatus('Sommelier-KI analysiert deine Etiketten...');
    setScanError(null);

    try {
      const wineData = await geminiService.analyzeLabel(
        frontImg,
        backImg || undefined
      );

      // Trigger success callback
      onScanComplete(wineData, frontImg);
      onClose();
    } catch (err: any) {
      console.error("Scan analysis failed:", err);
      setFailedImages({ front: frontImg, back: backImg });
      setScanError(err.message || "Etikett konnte nicht gelesen werden. Bitte erneut versuchen.");
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    // Trigger visual camera flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 250);

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

      if (mode === 'photo-only') {
        // Direct photo capture mode - just return the photo!
        onScanComplete(null, imageBase64);
        onClose();
        return;
      }

      // OCR Mode - Dual Step check
      if (step === 'front') {
        setFrontImage(imageBase64);
        setStep('back');
      } else {
        // We captured the back image! Analyze both
        await runOCRAnalysis(frontImage!, imageBase64);
      }

    } catch (err: any) {
      console.error("Capture processing failed:", err);
      setScanError("Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.");
    }
  };

  const handleSkipBackSide = async () => {
    if (!frontImage) return;
    await runOCRAnalysis(frontImage, null);
  };

  const getStepTitle = () => {
    if (mode === 'photo-only') return 'Foto aufnehmen';
    return step === 'front' 
      ? 'Flaschen-Vorderseite scannen' 
      : 'Flaschen-Rückseite scannen (optional)';
  };

  const getStepSubtitle = () => {
    if (mode === 'photo-only') return 'Fotografiere deinen Wein für die Weinkarte';
    return step === 'front'
      ? 'Positioniere die Vorderseite des Weinetiketts gut sichtbar im Bild'
      : 'Die Rückseite (Backlabel) liefert oft präzise Rebsorten, Winzer und Details';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
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
          <div className="flex flex-col sm:flex-row sm:items-center items-start gap-2">
            {mode === 'ocr' && (
              <span className="text-xs bg-[#8c1c2e] text-white px-2.5 py-0.5 rounded-full font-bold shrink-0">
                Schritt {step === 'front' ? '1 von 2' : '2 von 2'}
              </span>
            )}
            <h2 className="text-base sm:text-lg font-bold text-[#f3e8eb] tracking-tight">{getStepTitle()}</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">{getStepSubtitle()}</p>
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
              
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => {
                    setScanError(null);
                    startCamera('environment');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-lg text-[#d4af37] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Erneut versuchen
                </button>

                {failedImages && (
                  <button
                    onClick={async () => {
                      await addScanToQueue(failedImages.front, failedImages.back);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-xs font-bold rounded-lg text-amber-400 transition-all shadow-md"
                  >
                    📥 Lokal in Warteschlange speichern
                  </button>
                )}
              </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-5 border-t border-white/5 pt-4">
          
          {/* Left progress info / front thumbnail */}
          <div className="flex items-center gap-3 w-full sm:max-w-[50%]">
            {frontImage && step === 'back' ? (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border border-[#d4af37] overflow-hidden bg-black/40 flex-shrink-0">
                  <img src={frontImage} alt="Vorderseite" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Vorderseite bereit
                  </span>
                  Rückseite scannen für reichere Sommelier-Details.
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 leading-normal">
                Bilder werden verschlüsselt und lokal im Webbrowser verarbeitet.
              </p>
            )}
          </div>

          {/* Capture & Skip Buttons */}
          <div className="flex gap-2.5 justify-end w-full sm:w-auto">
            {/* Skip back-side button */}
            {step === 'back' && mode === 'ocr' && !loading && (
              <button
                onClick={handleSkipBackSide}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl text-gray-300 transition-all cursor-pointer flex-1 sm:flex-none"
                title="Rückseite überspringen und direkt auswerten"
              >
                Überspringen
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCapture}
              disabled={loading || !stream}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_15px_rgba(140,28,46,0.3)] disabled:opacity-50 flex-1 sm:flex-none cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {step === 'front' ? 'Foto aufnehmen' : 'Rückseite aufnehmen'}
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
