import React, { useMemo, useState } from 'react';
import { X, Store, AlertTriangle } from 'lucide-react';
import { Wine } from '../../core/entities/Wine';

interface MerchantCleanupModalProps {
  isOpen: boolean;
  wines: Wine[];
  onClose: () => void;
  /** Moves the selected „Weingut“ values to „Händler“; returns the number of wines changed. */
  onConfirm: (wineries: string[]) => Promise<number>;
}

/**
 * One-off cleanup (Q3): lists every Weingut that occurs on wines without a
 * Händler, so the user can mark which ones are actually merchants.
 */
export const MerchantCleanupModal: React.FC<MerchantCleanupModalProps> = ({ isOpen, wines, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => {
    const counts = new Map<string, number>();
    wines.forEach((w) => {
      const winery = w.winery.trim();
      if (winery && !w.merchant.trim()) counts.set(winery, (counts.get(winery) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [wines]);

  if (!isOpen) return null;

  const affected = candidates.filter((c) => selected.has(c.name)).reduce((sum, c) => sum + c.count, 0);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const close = () => {
    setSelected(new Set());
    onClose();
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const changed = await onConfirm([...selected]);
      alert(`${changed} ${changed === 1 ? 'Wein' : 'Weine'} angepasst. Das Weingut ist dort jetzt leer und kann ergänzt werden.`);
      close();
    } catch (err) {
      console.error('Merchant cleanup failed:', err);
      alert('Das hat nicht geklappt. Deine Weinliste wurde nicht verändert.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-title"
        className="bg-[#12080a] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md relative max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-5"
      >
        <button
          onClick={close}
          disabled={busy}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#8c1c2e]/10 border border-[#8c1c2e]/30 rounded-2xl">
            <Store className="w-6 h-6 text-[#d4af37]" />
          </div>
          <div>
            <h2 id="cleanup-title" className="text-lg font-bold text-[#f3e8eb]">Händler aufräumen</h2>
            <p className="text-xs text-gray-400">Händler, die unter „Weingut“ stehen, ins richtige Feld verschieben</p>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Markiere, welche Einträge eigentlich Händler sind. Sie werden bei allen betroffenen Weinen ins Feld
          „Händler“ verschoben; das Weingut bleibt dort leer und kann später ergänzt werden.
        </p>

        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white/5 border border-white/10 rounded-2xl p-4">
            Alle Weine mit Weingut haben schon einen Händler – nichts aufzuräumen.
          </p>
        ) : (
          <div className="flex flex-col border border-white/10 rounded-2xl divide-y divide-white/5 max-h-[45vh] overflow-y-auto">
            {candidates.map((c) => {
              const isSelected = selected.has(c.name);
              return (
                <label key={c.name} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(c.name)}
                    className="w-4 h-4 accent-[#d4af37] shrink-0"
                  />
                  <span className="flex-grow min-w-0">
                    <span className="block text-sm text-white truncate">{c.name}</span>
                    <span className="block text-[11px] text-gray-500">{c.count} {c.count === 1 ? 'Wein' : 'Weine'}</span>
                  </span>
                  <span className={`text-[11px] shrink-0 ${isSelected ? 'text-[#d4af37] font-semibold' : 'text-gray-500'}`}>
                    {isSelected ? 'wird Händler' : 'bleibt Weingut'}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {affected > 0 && (
          <div className="flex gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Zur Sicherheit wird deine Weinliste vorher als Datei heruntergeladen.</span>
          </div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={close}
            disabled={busy}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || affected === 0}
            className="px-5 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-xs font-bold rounded-xl text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Wird angepasst...' : affected > 0 ? `${affected} ${affected === 1 ? 'Wein' : 'Weine'} anpassen` : 'Nichts ausgewählt'}
          </button>
        </div>
      </div>
    </div>
  );
};
