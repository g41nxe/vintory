import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Heart, Camera, Upload } from 'lucide-react';
import { Wine } from '../../core/entities/Wine';

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
  const [formData, setFormData] = useState<Wine>({
    id: '',
    name: '',
    type: 'Rotwein',
    year: null,
    winery: '',
    region: '',
    grape: '',
    price: '',
    quantity: 1,
    rating: 3,
    image: '',
    isFavorite: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize fields on open
  useEffect(() => {
    if (isOpen) {
      if (wine) {
        // Edit mode
        setFormData({ ...wine });
      } else if (scannedData) {
        // OCR Review Mode
        setFormData({
          id: Math.random().toString(36).substring(2, 9),
          name: scannedData.name || '',
          type: scannedData.type || 'Rotwein',
          year: scannedData.year || null,
          winery: scannedData.winery || '',
          region: scannedData.region || '',
          grape: scannedData.grape || '',
          price: '',
          quantity: 1,
          rating: 3,
          image: scannedImage || '',
          isFavorite: false
        });
      } else {
        // Add new empty mode
        setFormData({
          id: Math.random().toString(36).substring(2, 9),
          name: '',
          type: 'Rotwein',
          year: null,
          winery: '',
          region: '',
          grape: '',
          price: '',
          quantity: 1,
          rating: 3,
          image: '',
          isFavorite: false
        });
      }
    }
  }, [isOpen, wine, scannedData, scannedImage]);

  // Support reactive image updates when user snaps a photo via overlay scanner!
  useEffect(() => {
    if (isOpen && scannedImage) {
      setFormData((prev) => ({ ...prev, image: scannedImage }));
    }
  }, [isOpen, scannedImage]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? (value ? Number(value) : null) : value
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleToggleFavorite = () => {
    setFormData((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
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
      await onSave(formData);
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
            {wine ? 'Eintrag bearbeiten' : scannedData ? 'Daten überprüfen' : 'Wein hinzufügen'}
          </h2>
          <p className="text-xs text-gray-400">
            {scannedData ? 'Prüfe und vervollständige die erkannten Etikettendaten' : 'Pflege alle relevanten Informationen deines Weins ein'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Image & Camera Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
            
            {/* Image Preview Box */}
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

            {/* Photo Action Buttons */}
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

          {/* Form Grid Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Wine Name */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-gray-400">Name des Weins *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="z. B. Sassicaia"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Winery / Winzer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Winzer / Weingut</label>
              <input
                type="text"
                name="winery"
                value={formData.winery}
                onChange={handleInputChange}
                placeholder="z. B. Tenuta San Guido"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Wine Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Weintyp</label>
              <select
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

            {/* Grape / Rebsorte */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Rebsorte(n)</label>
              <input
                type="text"
                name="grape"
                value={formData.grape}
                onChange={handleInputChange}
                placeholder="z. B. Cabernet Sauvignon, Cabernet Franc"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Cultivation Region */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Region / Anbaugebiet</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="z. B. Toskana (Bolgheri)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Vintage Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Jahrgang</label>
              <input
                type="number"
                name="year"
                value={formData.year || ''}
                onChange={handleInputChange}
                placeholder="z. B. 2018"
                min="1800"
                max="2100"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Preis (€)</label>
              <input
                type="text"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="z. B. 189.50"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400">Bestand (Flaschen)</label>
              <input
                type="number"
                name="quantity"
                required
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                min="0"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
              />
            </div>

            {/* Star Rating & Favorites Star Row */}
            <div className="flex justify-between items-center sm:col-span-2 bg-white/5 p-4 rounded-xl border border-white/5 mt-2">
              
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-400">Deine Bewertung</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => handleRatingChange(stars)}
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
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  formData.isFavorite
                    ? 'bg-[#8c1c2e]/20 text-[#8c1c2e] border-[#8c1c2e]/40 shadow-[0_2px_8px_rgba(140,28,46,0.15)]'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${formData.isFavorite ? 'fill-current' : ''}`} />
                {formData.isFavorite ? 'Favorit' : 'Zu Favoriten'}
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
