import React, { useState } from 'react';
import { X, Upload, GitMerge, Replace, AlertTriangle } from 'lucide-react';
import type { ImportPreview } from '../context/VintoryContext';
import type { ImportMode } from '../../core/services/backupImport';

interface ImportModalProps {
  preview: ImportPreview | null;
  onCancel: () => void;
  onConfirm: (mode: ImportMode) => Promise<void>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const ImportModal: React.FC<ImportModalProps> = ({ preview, onCancel, onConfirm }) => {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [busy, setBusy] = useState(false);

  if (!preview) return null;

  const total = preview.wines.length;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(mode);
    } finally {
      setBusy(false);
      setMode('merge');
    }
  };

  const handleCancel = () => {
    setMode('merge');
    onCancel();
  };

  const optionClass = (active: boolean, danger = false) =>
    `w-full text-left flex gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
      active
        ? danger
          ? 'bg-red-900/25 border-red-500/60'
          : 'bg-[#d4af37]/15 border-[#d4af37]/60'
        : 'bg-white/5 border-white/10 hover:bg-white/10'
    }`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="bg-[#12080a] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md relative max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-5"
      >
        <button
          onClick={handleCancel}
          disabled={busy}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
          title="Abbrechen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#8c1c2e]/10 border border-[#8c1c2e]/30 rounded-2xl">
            <Upload className="w-6 h-6 text-[#d4af37]" />
          </div>
          <div>
            <h2 id="import-title" className="text-lg font-bold text-[#f3e8eb]">Backup importieren</h2>
            <p className="text-xs text-gray-400">Wähle, wie das Backup übernommen werden soll.</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 leading-relaxed">
          Das Backup enthält <strong className="text-white">{plural(total, 'Wein', 'Weine')}</strong>:{' '}
          {plural(preview.newCount, 'neuer', 'neue')}, {preview.alreadyPresentCount} bereits in deinem Keller.
          {preview.skipped > 0 && (
            <span className="block mt-1 text-amber-400">
              {plural(preview.skipped, 'ungültiger Eintrag wird', 'ungültige Einträge werden')} übersprungen.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setMode('merge')} className={optionClass(mode === 'merge')}>
            <GitMerge className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-bold text-white">Zusammenführen (empfohlen)</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                Fügt {plural(preview.newCount, 'neuen Wein', 'neue Weine')} hinzu. Deine vorhandenen{' '}
                {plural(preview.currentCount, 'Wein bleibt', 'Weine bleiben')} unverändert.
              </span>
            </span>
          </button>

          <button type="button" onClick={() => setMode('replace')} className={optionClass(mode === 'replace', true)}>
            <Replace className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-bold text-white">Keller ersetzen</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                Löscht deinen aktuellen Keller ({plural(preview.currentCount, 'Wein', 'Weine')}) und übernimmt
                genau das Backup.
              </span>
            </span>
          </button>
        </div>

        {mode === 'replace' && preview.currentCount > 0 && (
          <div className="flex gap-2.5 bg-red-900/20 border border-red-500/30 rounded-2xl p-3 text-xs text-red-200 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              Zur Sicherheit wird dein aktueller Keller vorher als Datei heruntergeladen
              („…_vor_import.json“). Damit kannst du ihn jederzeit wiederherstellen.
            </span>
          </div>
        )}

        <div className="flex gap-2.5 justify-end pt-1">
          <button
            onClick={handleCancel}
            disabled={busy}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || (mode === 'merge' && preview.newCount === 0)}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'replace' ? 'bg-red-700 hover:bg-red-700/90' : 'bg-[#8c1c2e] hover:bg-[#8c1c2e]/90'
            }`}
          >
            {busy
              ? 'Wird importiert...'
              : mode === 'replace'
                ? 'Keller ersetzen'
                : preview.newCount === 0
                  ? 'Nichts Neues zu importieren'
                  : `${plural(preview.newCount, 'Wein', 'Weine')} hinzufügen`}
          </button>
        </div>
      </div>
    </div>
  );
};
