import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSave
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(apiKey);
    }
  }, [isOpen, apiKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(keyInput.trim());
      onClose();
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div className="bg-[#12080a] border border-white/10 p-8 rounded-3xl w-full max-w-md relative max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#8c1c2e]/10 border border-[#8c1c2e]/30 rounded-2xl">
            <Key className="w-6 h-6 text-[#d4af37]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#f3e8eb] tracking-tight">Einstellungen</h2>
            <p className="text-xs text-gray-400">Konfiguriere deinen lokalen Scanner</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#8c1c2e]/10 border border-[#8c1c2e]/20 p-4 rounded-xl mb-6">
          <p className="text-xs text-gray-300 leading-relaxed">
            Der Etiketten-Scanner nutzt die <strong>Google Gemini API</strong>, um Fotos direkt im Browser lokal zu analysieren.
            Dein Key wird sicher und ausschließlich auf deinem Gerät (IndexedDB) bzw. in deiner privaten <code>.env</code>-Datei gespeichert.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-semibold text-gray-400">
              Gemini API-Key
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] focus:ring-1 focus:ring-[#8c1c2e] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                title={showKey ? 'Verbergen' : 'Anzeigen'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {apiKey && (
              <span className="text-[10px] text-green-500 font-semibold mt-1">
                ✓ API-Key aktiv geladen
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-4 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[#f3e8eb] font-semibold rounded-xl text-sm transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(140,28,46,0.3)] disabled:opacity-50"
            >
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
