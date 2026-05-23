import React from 'react';
import { Wine } from '../../core/entities/Wine';
import { Heart, Trash2, Plus, Minus, Star } from 'lucide-react';

interface WineCardProps {
  wine: Wine;
  onEdit: (wine: Wine) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (wine: Wine, newQty: number) => void;
  onToggleFavorite: (wine: Wine) => void;
}

export const WineCard: React.FC<WineCardProps> = ({
  wine,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onToggleFavorite
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3 h-3 sm:w-4 sm:h-4 ${
            i <= rating ? 'text-[#d4af37] fill-[#d4af37]' : 'text-gray-600'
          }`}
        />
      );
    }
    return stars;
  };

  const getWineBadgeColor = (type: string) => {
    switch (type) {
      case 'Rotwein': return 'bg-[#8c1c2e] text-white';
      case 'Weißwein': return 'bg-[#d4af37]/80 text-[#12080a]';
      case 'Rosé': return 'bg-pink-600 text-white';
      case 'Schaumwein': return 'bg-yellow-600 text-white';
      default: return 'bg-[#8c1c2e] text-white';
    }
  };

  return (
    <div className="wine-card group bg-[#1c2230]/70 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 sm:p-6 transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] hover:border-[#8c1c2e]/50 flex flex-row sm:flex-col gap-3.5 sm:gap-4 relative overflow-hidden">
      
      {/* Wine Image Container */}
      <div className="w-[88px] h-[116px] sm:w-full sm:h-48 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer relative shrink-0" onClick={() => onEdit(wine)}>
        
        {/* Favorite Icon (Overlay on top-left of image) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(wine);
          }}
          className={`absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 transition-all duration-200 cursor-pointer ${
            wine.isFavorite ? 'text-[#8c1c2e]' : 'text-gray-400 hover:text-[#8c1c2e]'
          }`}
          title="Als Favorit markieren"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${wine.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Wine Type Badge (Overlay on top-right, hidden on mobile in favor of next-to-name badge) */}
        <span className={`absolute top-3 right-3 z-10 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getWineBadgeColor(wine.type)} shadow-md backdrop-blur-sm hidden sm:block`}>
          {wine.type}
        </span>

        {wine.image ? (
          <img
            src={wine.image}
            alt={wine.name}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-500">
            <span className="text-2xl sm:text-3xl">🍷</span>
            <span className="text-[10px] sm:text-xs">Kein Bild</span>
          </div>
        )}
      </div>

      {/* Content Wrapper for Right Hand Side (Mobile) or Below Image (Desktop) */}
      <div className="flex-grow flex flex-col justify-between min-w-0 gap-2">
        
        {/* Wine Description Info */}
        <div className="flex-grow flex flex-col gap-0.5 sm:gap-1 cursor-pointer" onClick={() => onEdit(wine)}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-lg font-bold text-[#f3e8eb] truncate group-hover:text-[#d4af37] transition-colors duration-200 flex-grow">
              {wine.name || 'Unbenannter Wein'}
            </h3>
            {/* Mobile Type Badge next to name */}
            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getWineBadgeColor(wine.type)} shadow-sm backdrop-blur-sm sm:hidden mt-0.5`}>
              {wine.type}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 font-semibold truncate">
            {wine.winery || 'Unbekanntes Weingut'}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
            {wine.grape ? `${wine.grape} • ` : ''}{wine.region || 'Region unbekannt'} {wine.year ? `(${wine.year})` : ''}
          </p>
        </div>

        {/* Wine Stats, Actions and Rating Footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2 sm:pt-3 mt-1 sm:mt-2">
          
          {/* Star Rating & Price */}
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">
              {renderStars(wine.rating)}
            </div>
            <span className="text-[10px] sm:text-xs text-[#d4af37] font-semibold mt-0.5">
              {wine.price ? `${wine.price} €` : 'Preis offen'}
            </span>
          </div>

          {/* Quantity Controller & Delete */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-black/30 border border-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(wine, Math.max(0, wine.quantity - 1));
                }}
                className="p-1 sm:p-1 text-[#d4af37] hover:bg-white/10 rounded-full transition-colors duration-150 cursor-pointer"
                title="Menge verringern"
              >
                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <span className="w-4 sm:w-6 text-center text-xs sm:text-sm font-bold text-white">
                {wine.quantity}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(wine, wine.quantity + 1);
                }}
                className="p-1 sm:p-1 text-[#d4af37] hover:bg-white/10 rounded-full transition-colors duration-150 cursor-pointer"
                title="Menge erhöhen"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(wine.id);
              }}
              className="p-1.5 sm:p-2 text-red-500/70 sm:text-red-500/50 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors duration-200 cursor-pointer"
              title="Wein löschen"
            >
              <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
