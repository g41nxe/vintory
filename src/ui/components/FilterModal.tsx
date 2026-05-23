import React from 'react';
import { X, Filter, ArrowUpDown, RotateCcw, Check } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy
}) => {
  if (!isOpen) return null;

  const wineTypes = [
    { value: 'Alle', label: 'Alle Weintypen', emoji: '🍷', color: 'bg-white/5 border-white/10 text-white hover:bg-white/10' },
    { value: 'Rotwein', label: 'Rotwein', emoji: '🍷', color: 'bg-[#8c1c2e]/10 border-[#8c1c2e]/30 text-[#f3e8eb] hover:bg-[#8c1c2e]/25' },
    { value: 'Weißwein', label: 'Weißwein', emoji: '🥂', color: 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/25' },
    { value: 'Rosé', label: 'Rosé', emoji: '🌸', color: 'bg-pink-600/10 border-pink-500/30 text-pink-400 hover:bg-pink-600/25' },
    { value: 'Schaumwein', label: 'Schaumwein', emoji: '🍾', color: 'bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-600/25' }
  ];

  const sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'year-desc', label: 'Jahrgang (Neu-Alt)' },
    { value: 'year-asc', label: 'Jahrgang (Alt-Neu)' },
    { value: 'rating-desc', label: 'Beste Bewertung' },
    { value: 'qty-desc', label: 'Meiste Flaschen' },
    { value: 'price-desc', label: 'Teuerster Preis' }
  ];

  const handleReset = () => {
    setTypeFilter('Alle');
    setSortBy('name-asc');
  };

  const getActiveTypeColor = (type: string) => {
    switch (type) {
      case 'Rotwein': return 'bg-[#8c1c2e]/30 border-[#8c1c2e] text-white shadow-[0_0_12px_rgba(140,28,46,0.3)]';
      case 'Weißwein': return 'bg-[#d4af37]/30 border-[#d4af37] text-white shadow-[0_0_12px_rgba(212,175,55,0.3)]';
      case 'Rosé': return 'bg-pink-600/30 border-pink-500 text-white shadow-[0_0_12px_rgba(219,39,119,0.3)]';
      case 'Schaumwein': return 'bg-amber-600/30 border-amber-500 text-white shadow-[0_0_12px_rgba(217,119,6,0.3)]';
      default: return 'bg-white/15 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
      <div className="bg-[#12080a] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md relative max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 cursor-pointer"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#8c1c2e]/10 border border-[#8c1c2e]/30 rounded-2xl">
            <Filter className="w-6 h-6 text-[#d4af37]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#f3e8eb] tracking-tight">Filter & Sortierung</h2>
            <p className="text-xs text-gray-400">Passe deine Keller-Ansicht an</p>
          </div>
        </div>

        {/* --- Weintyp filtern --- */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weintyp filtern</h3>
          
          <div className="grid grid-cols-2 gap-2">
            {wineTypes.map((type) => {
              const isSelected = typeFilter === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTypeFilter(type.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    type.value === 'Alle' ? 'col-span-2' : ''
                  } ${
                    isSelected ? getActiveTypeColor(type.value) : type.color
                  }`}
                >
                  <span className="text-sm">{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Sortierung nach --- */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <h3>Sortierung</h3>
          </div>
          
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {sortOptions.map((opt) => {
              const isSelected = sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortBy(opt.value)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#d4af37]/10 border-[#d4af37]/45 text-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.05)]'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#d4af37]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Modal Actions --- */}
        <div className="flex gap-3 justify-between items-center border-t border-white/5 pt-4 mt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl"
            title="Filter & Sortierung zurücksetzen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zurücksetzen
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-[0_4px_12px_rgba(140,28,46,0.3)] cursor-pointer"
          >
            Fertig
          </button>
        </div>

      </div>
    </div>
  );
};
