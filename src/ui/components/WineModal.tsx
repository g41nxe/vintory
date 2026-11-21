import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Star, Heart, Camera, Upload, Plus, Minus, PenLine, CopyPlus } from 'lucide-react';
import { Wine, DEFAULT_TAGS, generateWineId, isOwned, todayIso } from '../../core/entities/Wine';
import { useVintory } from '../context/VintoryContext';
import { getNewWineOwnedDefault, setNewWineOwnedDefault } from '../preferences';

// Helper functions for fuzzy string matching (Levenshtein Distance)
const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove accents/diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // Strip spaces, punctuation & non-alphanumeric characters
};

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const isSimilar = (str1: string, str2: string, threshold = 0.75): boolean => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (s1 === s2) return true;
  if (!s1 || !s2) return false;

  const maxLength = Math.max(s1.length, s2.length);
  const distance = getLevenshteinDistance(s1, s2);
  const similarity = 1 - distance / maxLength;
  return similarity >= threshold;
};

// Same wine = similar name + similar winery + same vintage (ADR 0005).
const findDuplicate = (wines: Wine[], candidate: Pick<Wine, 'id' | 'name' | 'winery' | 'year'>): Wine | undefined => {
  if (!candidate.name.trim()) return undefined;
  return wines.find(
    (w) =>
      w.id !== candidate.id &&
      w.year === candidate.year &&
      isSimilar(w.name, candidate.name, 0.75) &&
      isSimilar(w.winery, candidate.winery, 0.75)
  );
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

const createEmptyWine = (owned: boolean): Wine => ({
  id: generateWineId(),
  name: '',
  type: 'Rotwein',
  year: null,
  winery: '',
  region: '',
  grape: '',
  price: '',
  quantity: owned ? 1 : 0,
  rating: 3,
  image: '',
  isFavorite: false,
  merchant: '',
  comment: '',
  tags: [],
  // Not owned → most likely just tasted: prefill today (Q12).
  tastedAt: owned ? null : todayIso(),
});

const inputClass =
  'bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all';
const labelClass = 'text-[11px] font-semibold text-gray-400';

interface WineModalProps {
  isOpen: boolean;
  onClose: () => void;
  wine: Wine | null;
  scannedImage: string;
  scannedData: Partial<Wine> | null;
  onSave: (wine: Wine) => Promise<void>;
  onTriggerCamera: () => void;
}

export const WineModal: React.FC<WineModalProps> = ({
  isOpen,
  onClose,
  wine,
  scannedImage,
  scannedData,
  onSave,
  onTriggerCamera
}) => {
  const { wines } = useVintory();
  // Read the list via a ref when the dialog opens: if `wines` changes while the
  // dialog is open (e.g. a background scan finishes), the form must NOT reset.
  const winesRef = useRef(wines);
  winesRef.current = wines;

  const [formData, setFormData] = useState<Wine>(() => createEmptyWine(true));
  /** True while editing a wine that already exists in the list. */
  const [isExisting, setIsExisting] = useState(false);
  /** True while tastedAt still holds the automatic „today“ prefill. */
  const [tastedAtAuto, setTastedAtAuto] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);

  const duplicateWine = useMemo(
    () => (isExisting ? undefined : findDuplicate(wines, formData)),
    [wines, formData, isExisting]
  );

  // Merchants already used, most frequent first – suggestions for the merchant field (Q4).
  const merchantSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    wines.forEach((w) => {
      const m = w.merchant.trim();
      if (m) counts.set(m, (counts.get(m) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([m]) => m);
  }, [wines]);

  // Default tags first, then custom tags used anywhere in the list (Q8).
  const availableTags = useMemo(() => {
    const custom = new Set<string>();
    wines.forEach((w) => w.tags.forEach((t) => custom.add(t)));
    formData.tags.forEach((t) => custom.add(t));
    DEFAULT_TAGS.forEach((t) => custom.delete(t));
    return [...DEFAULT_TAGS, ...[...custom].sort((a, b) => a.localeCompare(b))];
  }, [wines, formData.tags]);

  // Initialize fields on open
  useEffect(() => {
    if (!isOpen) return;
    setCustomTag('');
    if (wine) {
      // Edit mode
      setFormData({ ...wine });
      setIsExisting(true);
      setTastedAtAuto(false);
      setShowQuickAction(false);
      return;
    }

    const owned = getNewWineOwnedDefault();
    const base = createEmptyWine(owned);
    setIsExisting(false);
    setTastedAtAuto(!owned);

    if (scannedData) {
      // Scan review mode
      const scanned: Wine = {
        ...base,
        name: scannedData.name || '',
        type: scannedData.type || 'Rotwein',
        year: scannedData.year || null,
        winery: scannedData.winery || '',
        region: scannedData.region || '',
        grape: scannedData.grape || '',
        price: scannedData.price || '',
        image: scannedImage || '',
      };
      setFormData(scanned);
      // Wine already in the list? Show the „Schon in deiner Weinliste“ prompt first (Q10).
      setShowQuickAction(Boolean(findDuplicate(winesRef.current, scanned)));
    } else {
      setFormData(base);
      setShowQuickAction(false);
    }
  }, [isOpen, wine, scannedData, scannedImage]);

  // Support reactive image updates when user snaps a photo via overlay scanner!
  useEffect(() => {
    if (isOpen && scannedImage) {
      setFormData((prev) => ({ ...prev, image: scannedImage }));
    }
  }, [isOpen, scannedImage]);

  if (!isOpen) return null;

  const openExisting = (existing: Wine) => {
    setFormData({ ...existing });
    setIsExisting(true);
    setTastedAtAuto(false);
    setShowQuickAction(false);
  };

  const addBottle = async (existing: Wine) => {
    await onSave({ ...existing, quantity: existing.quantity + 1 });
    onClose();
  };

  // Render "already in your list" prompt for a scanned duplicate
  if (scannedData && duplicateWine && showQuickAction) {
    const owned = isOwned(duplicateWine);
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in">
        <div className="bg-[#12080a] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-md relative shadow-2xl flex flex-col items-center text-center gap-5 animate-scale-up">

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 cursor-pointer z-50"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-3xl">
            🍷
          </div>

          <div>
            <span className="text-[10px] bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Schon in deiner Weinliste
            </span>
            <h2 className="text-xl font-extrabold text-[#f3e8eb] tracking-tight mt-3">
              {duplicateWine.name}
            </h2>
            <p className="text-sm text-gray-400 font-semibold mt-1">
              {duplicateWine.winery || 'Unbekanntes Weingut'}
              {duplicateWine.year ? ` · ${duplicateWine.year}` : ' · ohne Jahrgang'}
            </p>
          </div>

          {/* What you noted last time */}
          <div className="bg-white/5 border border-white/5 w-full p-4 rounded-2xl flex flex-col gap-2 text-left text-xs">
            <div className="flex justify-between items-center">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= duplicateWine.rating ? 'text-[#d4af37] fill-[#d4af37]' : 'text-gray-600'}`} />
                ))}
              </div>
              <span className="text-gray-400">
                {owned
                  ? `Im Besitz · ${duplicateWine.quantity} ${duplicateWine.quantity === 1 ? 'Flasche' : 'Flaschen'}`
                  : 'Nicht im Besitz'}
              </span>
            </div>
            {duplicateWine.tastedAt && (
              <p className="text-gray-400">Verkostet am {formatDate(duplicateWine.tastedAt)}</p>
            )}
            {duplicateWine.comment ? (
              <p className="text-gray-300 italic line-clamp-3">„{duplicateWine.comment}“</p>
            ) : (
              <p className="text-gray-500">Kein Kommentar</p>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={() => openExisting(duplicateWine)}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-2xl text-sm transition-all cursor-pointer"
            >
              <PenLine className="w-5 h-5" />
              Eintrag öffnen
            </button>

            {owned && (
              <button
                type="button"
                onClick={() => addBottle(duplicateWine)}
                className="flex items-center justify-center gap-2.5 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl text-sm transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Eine Flasche mehr (+1)
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowQuickAction(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-[#d4af37] hover:underline font-bold transition-all cursor-pointer"
            >
              <CopyPlus className="w-4 h-4" />
              Trotzdem neu anlegen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const owned = isOwned(formData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? (value ? Number(value) : null) : value
    }));
  };

  const handleOwnedToggle = () => {
    const nowOwned = !owned;
    // For a new wine, keep the „today“ prefill in sync with the owned switch (Q12).
    let tastedAt = formData.tastedAt;
    if (!isExisting) {
      if (nowOwned && tastedAtAuto) {
        tastedAt = null;
        setTastedAtAuto(false);
      } else if (!nowOwned && !formData.tastedAt) {
        tastedAt = todayIso();
        setTastedAtAuto(true);
      }
    }
    setFormData({ ...formData, quantity: nowOwned ? 1 : 0, tastedAt });
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
    }));
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (!tag) return;
    setFormData((prev) => (prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }));
    setCustomTag('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      // Downscale uploaded photo in a temporary image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const maxDim = 600;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData((prev) => ({ ...prev, image: compressedBase64 }));
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Der Name des Weins darf nicht leer sein.");
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ ...formData, merchant: formData.merchant.trim(), comment: formData.comment.trim() });
      if (!isExisting) {
        // Remember the owned choice for the next new wine on this device (Q7).
        setNewWineOwnedDefault(isOwned(formData));
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div className="bg-[#12080a] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-lg relative max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 z-50"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#f3e8eb] tracking-tight">
            {isExisting ? 'Eintrag bearbeiten' : scannedData ? 'Daten überprüfen' : 'Wein hinzufügen'}
          </h2>
          <p className="text-xs text-gray-400">
            {scannedData && !isExisting ? 'Prüfe und vervollständige die erkannten Etikettendaten' : 'Halte alles Wichtige zu deinem Wein fest'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Image & Camera Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start bg-white/5 p-4 rounded-2xl border border-white/5">

            <div className="w-full aspect-video sm:aspect-square bg-black/35 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative">
              {formData.image ? (
                <img
                  src={formData.image}
                  alt="Wine Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-600">
                  <span className="text-3xl">🍷</span>
                  <span className="text-[10px]">Kein Bild vorhanden</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full justify-center">
              <button
                type="button"
                onClick={onTriggerCamera}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
              >
                <Camera className="w-4 h-4" />
                Kamera einschalten
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all"
              >
                <Upload className="w-4 h-4" />
                Datei hochladen
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

          </div>

          {/* Duplicate hint */}
          {duplicateWine && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 animate-fade-in text-xs">
              <span className="text-base mt-0.5">⚠️</span>
              <div className="flex-grow">
                <p className="font-bold text-amber-300">Schon in deiner Weinliste</p>
                <p className="text-gray-400 mt-1">
                  <strong>{duplicateWine.name}</strong> ({duplicateWine.year || 'ohne Jahrgang'}) von <strong>{duplicateWine.winery || 'unbekanntem Weingut'}</strong> gibt es bereits.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openExisting(duplicateWine)}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
                  >
                    Vorhandenen Eintrag öffnen
                  </button>
                  {isOwned(duplicateWine) && (
                    <button
                      type="button"
                      onClick={() => addBottle(duplicateWine)}
                      className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
                    >
                      Eine Flasche mehr (+1)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Wine Name */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="wine-name">Name des Weins *</label>
              <input
                id="wine-name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="z. B. Sassicaia"
                className={inputClass}
              />
            </div>

            {/* Winery */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-winery">Weingut</label>
              <input
                id="wine-winery"
                type="text"
                name="winery"
                value={formData.winery}
                onChange={handleInputChange}
                placeholder="z. B. Tenuta San Guido"
                className={inputClass}
              />
            </div>

            {/* Merchant */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-merchant">Händler</label>
              <input
                id="wine-merchant"
                type="text"
                name="merchant"
                list="merchant-suggestions"
                autoComplete="off"
                value={formData.merchant}
                onChange={handleInputChange}
                placeholder="Wo gekauft oder probiert?"
                className={inputClass}
              />
              <datalist id="merchant-suggestions">
                {merchantSuggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Wine Type */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-type">Weintyp</label>
              <select
                id="wine-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="bg-[#12080a] border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              >
                <option value="Rotwein">🍷 Rotwein</option>
                <option value="Weißwein">🥂 Weißwein</option>
                <option value="Rosé">🌸 Rosé</option>
                <option value="Schaumwein">🍾 Schaumwein</option>
              </select>
            </div>

            {/* Vintage Year */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-year">Jahrgang</label>
              <input
                id="wine-year"
                type="number"
                name="year"
                value={formData.year || ''}
                onChange={handleInputChange}
                placeholder="z. B. 2018"
                min="1800"
                max="2100"
                className={inputClass}
              />
            </div>

            {/* Grape */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-grape">Rebsorte(n)</label>
              <input
                id="wine-grape"
                type="text"
                name="grape"
                value={formData.grape}
                onChange={handleInputChange}
                placeholder="z. B. Cabernet Sauvignon"
                className={inputClass}
              />
            </div>

            {/* Region */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-region">Region / Anbaugebiet</label>
              <input
                id="wine-region"
                type="text"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="z. B. Toskana (Bolgheri)"
                className={inputClass}
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-price">Preis (€)</label>
              <input
                id="wine-price"
                type="text"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="z. B. 189.50"
                className={inputClass}
              />
            </div>

            {/* Tasted at */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="wine-tasted">Verkostet am</label>
              <input
                id="wine-tasted"
                type="date"
                value={formData.tastedAt || ''}
                onChange={(e) => {
                  setTastedAtAuto(false);
                  setFormData((prev) => ({ ...prev, tastedAt: e.target.value || null }));
                }}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>

            {/* Owned + quantity */}
            <div className="flex items-center justify-between gap-3 sm:col-span-2 bg-white/5 p-4 rounded-xl border border-white/5">
              <button
                type="button"
                role="switch"
                aria-checked={owned}
                onClick={handleOwnedToggle}
                className="flex items-center gap-3 cursor-pointer"
              >
                <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${owned ? 'bg-emerald-600' : 'bg-white/15'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${owned ? 'translate-x-5' : ''}`} />
                </span>
                <span className="text-sm font-semibold text-[#f3e8eb]">Im Besitz</span>
              </button>

              {owned && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Flaschen</span>
                  <div className="flex items-center bg-black/30 border border-white/10 px-2 py-1 rounded-full gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      className="p-1 text-[#d4af37] hover:bg-white/10 rounded-full"
                      title="Eine Flasche weniger"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-white">{formData.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                      className="p-1 text-[#d4af37] hover:bg-white/10 rounded-full"
                      title="Eine Flasche mehr"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="wine-comment">Kommentar</label>
              <textarea
                id="wine-comment"
                name="comment"
                rows={3}
                value={formData.comment}
                onChange={handleInputChange}
                placeholder="Wie hat er geschmeckt? Wozu passt er?"
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className={labelClass}>Eindruck</span>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const active = formData.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Eigenes Schlagwort"
                  maxLength={30}
                  className={`${inputClass} py-1.5 flex-grow min-w-0`}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl text-gray-300 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Hinzufügen
                </button>
              </div>
            </div>

            {/* Rating & favorite */}
            <div className="flex justify-between items-center sm:col-span-2 bg-white/5 p-4 rounded-xl border border-white/5">

              <div className="flex flex-col gap-1">
                <span className={labelClass}>Deine Bewertung</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, rating: stars }))}
                      className="p-0.5 hover:scale-110 transition-transform"
                      title={`${stars} Sterne geben`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          stars <= formData.rating
                            ? 'text-[#d4af37] fill-[#d4af37]'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, isFavorite: !prev.isFavorite }))}
                className={`flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  formData.isFavorite
                    ? 'bg-[#8c1c2e]/20 text-[#8c1c2e] border-[#8c1c2e]/40 shadow-[0_2px_8px_rgba(140,28,46,0.15)]'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 sm:w-4 sm:h-4 ${formData.isFavorite ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">
                  {formData.isFavorite ? 'Favorit' : 'Zu Favoriten'}
                </span>
              </button>

            </div>

          </div>

          {/* Action Footer Buttons */}
          <div className="flex gap-3 justify-end mt-4 border-t border-white/5 pt-4 sticky bottom-[-1.5rem] bg-[#12080a] py-4 z-[100]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[#f3e8eb] font-semibold rounded-xl text-sm transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(140,28,46,0.3)] disabled:opacity-50"
            >
              {submitting ? 'Speichern...' : 'Speichern'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
