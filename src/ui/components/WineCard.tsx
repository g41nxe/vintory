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
          className={`w-4 h-4 ${
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
    <div className="wine-card group bg-[#1c2230]/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] hover:border-[#8c1c2e]/50 flex flex-col gap-4 relative overflow-hidden">
      
      {/* Wine Type Badge */}
      <span className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full ${getWineBadgeColor(wine.type)}`}>
        {wine.type}
      </span>

      {/* Wine Image Container */}
      <div className="w-full h-48 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => onEdit(wine)}>
        {wine.image ? (
          <img
            src={wine.image}
            alt={wine.name}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <span className="text-3xl">🍷</span>
            <span className="text-xs">Kein Bild vorhanden</span>
          </div>
        )}
      </div>

      {/* Wine Description Info */}
      <div className="flex-grow flex flex-col gap-1 cursor-pointer" onClick={() => onEdit(wine)}>
        <h3 className="text-lg font-bold text-[#f3e8eb] truncate group-hover:text-[#d4af37] transition-colors duration-200">
          {wine.name || 'Unbenannter Wein'}
        </h3>
        <p className="text-sm text-gray-400 font-semibold truncate">
          {wine.winery || 'Unbekanntes Weingut'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {wine.grape ? `${wine.grape} • ` : ''}{wine.region || 'Region unbekannt'} {wine.year ? `(${wine.year})` : ''}
        </p>
      </div>

      {/* Wine Stats, Actions and Rating Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
        
        {/* Star Rating & Price */}
        <div className="flex flex-col gap-1">
          <div className="flex gap-0.5">
            {renderStars(wine.rating)}
          </div>
          <span className="text-xs text-[#d4af37] font-semibold">
            {wine.price ? `${wine.price} €` : 'Preis offen'}
          </span>
        </div>

        {/* Favorite Icon */}
        <button
          onClick={() => onToggleFavorite(wine)}
          className={`p-2 rounded-full hover:bg-white/5 transition-colors duration-200 ${
            wine.isFavorite ? 'text-[#8c1c2e]' : 'text-gray-500 hover:text-[#8c1c2e]'
          }`}
          title="Als Favorit markieren"
        >
          <Heart className={`w-5 h-5 ${wine.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Quantity Controller & Delete */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/30 border border-white/5 px-2 py-1 rounded-full">
            <button
              onClick={() => onUpdateQuantity(wine, Math.max(0, wine.quantity - 1))}
              className="p-1 text-[#d4af37] hover:bg-white/10 rounded-full transition-colors duration-150"
              title="Menge verringern"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-white">
              {wine.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(wine, wine.quantity + 1)}
              className="p-1 text-[#d4af37] hover:bg-white/10 rounded-full transition-colors duration-150"
              title="Menge erhöhen"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onDelete(wine.id)}
            className="p-2 text-red-500/50 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors duration-200"
            title="Wein löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
