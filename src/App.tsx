import React, { useState, useMemo, useRef } from 'react';
import { useVintory, VintoryProvider } from './ui/context/VintoryContext';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WineCard } from './ui/components/WineCard';
import { SettingsModal } from './ui/components/SettingsModal';
import { ScannerModal } from './ui/components/ScannerModal';
import { WineModal } from './ui/components/WineModal';
import { Wine } from './core/entities/Wine';
import { ExtractedWineData } from './core/services/GeminiService';
import { 
  Camera, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Wine as WineIcon, 
  TrendingUp, 
  Heart, 
  Database,
  ArrowUpDown
} from 'lucide-react';

const VintoryAppContent: React.FC = () => {
  const {
    wines,
    apiKey,
    loading,
    saveWine,
    deleteWine,
    saveApiKey,
    exportBackup,
    importBackup,
    
    // Offline scan queue & notifications
    queueItems,
    onlineStatus,
    processQueue,
    notifications,
    removeNotification
  } = useVintory();

  // PWA SW Register Hook for prompt updates
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('Vintory SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.error('Vintory SW Register Error:', error);
    }
  });

  // Search, Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Alle');
  const [sortBy, setSortBy] = useState('name-asc');

  // Modal open states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [wineModalOpen, setWineModalOpen] = useState(false);

  // Scanner operation mode: 'ocr' (read label) or 'photo-only' (just snapping cover photo)
  const [scannerMode, setScannerMode] = useState<'ocr' | 'photo-only'>('ocr');

  // Modal edit/scanned details states
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [scannedImage, setScannedImage] = useState('');
  const [scannedData, setScannedData] = useState<Partial<Wine> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Search & Filter Logic ---
  const filteredWines = useMemo(() => {
    return wines.filter((wine) => {
      const matchesSearch = 
        wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.winery.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.grape.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'Alle' || wine.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [wines, searchTerm, typeFilter]);

  // --- Sorting Logic ---
  const sortedWines = useMemo(() => {
    const list = [...filteredWines];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'year-desc':
          return (b.year || 0) - (a.year || 0);
        case 'year-asc':
          return (a.year || 0) - (b.year || 0);
        case 'rating-desc':
          return b.rating - a.rating;
        case 'qty-desc':
          return b.quantity - a.quantity;
        case 'price-desc':
          const priceA = parseFloat(a.price) || 0;
          const priceB = parseFloat(b.price) || 0;
          return priceB - priceA;
        default:
          return 0;
      }
    });
    return list;
  }, [filteredWines, sortBy]);

  // --- Real-time statistics calculations ---
  const stats = useMemo(() => {
    const totalDifferent = wines.length;
    const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0);
    const totalFavorites = wines.filter((w) => w.isFavorite).length;
    const totalValue = wines.reduce((sum, w) => {
      const price = parseFloat(w.price) || 0;
      return sum + (price * w.quantity);
    }, 0);

    return {
      totalDifferent,
      totalBottles,
      totalFavorites,
      totalValue: totalValue.toFixed(2)
    };
  }, [wines]);

  // --- Action Handlers ---
  const handleUpdateQuantity = async (wine: Wine, newQty: number) => {
    await saveWine({ ...wine, quantity: newQty });
  };

  const handleToggleFavorite = async (wine: Wine) => {
    await saveWine({ ...wine, isFavorite: !wine.isFavorite });
  };

  const handleEditWine = (wine: Wine) => {
    setSelectedWine(wine);
    setScannedData(null);
    setScannedImage('');
    setWineModalOpen(true);
  };

  const handleAddWineManual = () => {
    setSelectedWine(null);
    setScannedData(null);
    setScannedImage('');
    setWineModalOpen(true);
  };

  const handleScanComplete = (ocrData: ExtractedWineData | null, imageBase64: string) => {
    if (scannerMode === 'photo-only') {
      // Just set the scanned image to update the already open manual form!
      setScannedImage(imageBase64);
    } else {
      setSelectedWine(null);
      setScannedData(ocrData);
      setScannedImage(imageBase64);
      setWineModalOpen(true);
    }
  };

  const handleSaveWine = async (updatedWine: Wine) => {
    await saveWine(updatedWine);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const success = await importBackup(file);
    if (success) {
      alert("Backup erfolgreich importiert!");
    } else {
      alert("Fehler beim Importieren des Backups. Bitte Format prüfen.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0506] flex flex-col items-center justify-center gap-4 text-white">
        <div className="loading-ring w-12 h-12" />
        <p className="text-sm font-semibold tracking-widest text-[#d4af37] uppercase animate-pulse">
          Vintory Keller wird poliert...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 md:px-8 py-8 min-h-screen flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🍷</span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#d4af37] bg-clip-text text-transparent">
              Vintory
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            Dein exklusiver, intelligenter Weinkeller
          </p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          
          {/* Offline Scan Queue Badge */}
          {queueItems.length > 0 && (
            <button
              onClick={processQueue}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl animate-pulse cursor-pointer shadow-sm transition-all"
              title={`${queueItems.length} Scans ausstehend. Klicken zum manuellen Synchronisieren.`}
              disabled={!onlineStatus || !apiKey}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Warteschlange ({queueItems.length})
            </button>
          )}

          <button
            onClick={() => {
              setScannerMode('ocr');
              setScannerOpen(true);
            }}
            className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(140,28,46,0.3)]"
            title="Weinetikett einscannen"
          >
            <Camera className="w-4 h-4" />
            Scanner
          </button>

          <button
            onClick={handleAddWineManual}
            className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
            title="Wein manuell hinzufügen"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#d4af37] rounded-xl transition-all"
            title="Einstellungen"
          >
            <Settings className="w-5 h-5" />
          </button>

        </div>
      </header>

      {/* FILTER & BACKUP CONTROLS BAR */}
      <section className="bg-[#1c2230]/40 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search & Type filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-grow">
          
          {/* Search box */}
          <div className="relative flex items-center flex-grow max-w-md">
            <Search className="w-4 h-4 absolute left-4 text-gray-500" />
            <input
              type="text"
              placeholder="Suchen nach Name, Weingut, Rebsorte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all"
            />
          </div>

          {/* Type dropdown filter */}
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 absolute left-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#12080a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="Alle">Alle Weintypen</option>
              <option value="Rotwein">Rotweine</option>
              <option value="Weißwein">Weißweine</option>
              <option value="Rosé">Rosés</option>
              <option value="Schaumwein">Schaumweine</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-4 h-4 absolute left-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#12080a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="name-asc">Sortierung: Name (A-Z)</option>
              <option value="name-desc">Sortierung: Name (Z-A)</option>
              <option value="year-desc">Sortierung: Jahrgang (Neu-Alt)</option>
              <option value="year-asc">Sortierung: Jahrgang (Alt-Neu)</option>
              <option value="rating-desc">Sortierung: Beste Bewertung</option>
              <option value="qty-desc">Sortierung: Meiste Flaschen</option>
              <option value="price-desc">Sortierung: Teuerster Preis</option>
            </select>
          </div>

        </div>

        {/* Backup button controllers */}
        <div className="flex gap-2 justify-end">
          
          <button
            onClick={exportBackup}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-white transition-all"
            title="Keller-Backup herunterladen"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-white transition-all"
            title="Keller-Backup hochladen"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

        </div>

      </section>

      {/* THE VIRTUAL SHELF GRID */}
      <main className="flex-grow min-h-[50vh]">
        {sortedWines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-6 relative">
            {sortedWines.map((wine) => (
              <WineCard
                key={wine.id}
                wine={wine}
                onEdit={handleEditWine}
                onDelete={deleteWine}
                onUpdateQuantity={handleUpdateQuantity}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center gap-4 mt-6">
            <span className="text-5xl">🍷</span>
            <div>
              <h3 className="text-lg font-bold text-white">Dein Weinkeller ist noch leer</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                Füge deinen ersten Wein manuell hinzu oder scanne das Flaschenetikett direkt ein, damit unsere Sommelier-KI den Eintrag für dich anlegt!
              </p>
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all"
            >
              <Camera className="w-4 h-4" />
              Etikett einscannen
            </button>
          </div>
        )}
      </main>

      {/* STATISTICS FOOTER SECTION */}
      <footer className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1c2230]/40 border border-white/5 p-6 rounded-3xl mt-8">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#8c1c2e]/10 border border-[#8c1c2e]/20 rounded-xl text-[#8c1c2e]">
            <WineIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Rebsorten</p>
            <h4 className="text-lg font-bold text-white">{stats.totalDifferent}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl text-[#d4af37]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Flaschen total</p>
            <h4 className="text-lg font-bold text-white">{stats.totalBottles}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#8c1c2e]/10 border border-[#8c1c2e]/20 rounded-xl text-[#8c1c2e]">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Favoriten</p>
            <h4 className="text-lg font-bold text-white">{stats.totalFavorites}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl text-[#d4af37]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Geschätzter Wert</p>
            <h4 className="text-lg font-bold text-[#d4af37]">{stats.totalValue} €</h4>
          </div>
        </div>

      </footer>

      {/* ALL MODAL WINDOWS */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSave={saveApiKey}
      />

      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        apiKey={apiKey}
        mode={scannerMode}
        onScanComplete={handleScanComplete}
        onRedirectToSettings={() => {
          setSettingsOpen(true);
          alert("Bitte trage zuerst deinen Gemini API-Key in den Einstellungen ein, um den Scanner zu nutzen.");
        }}
      />

      <WineModal
        isOpen={wineModalOpen}
        onClose={() => {
          setWineModalOpen(false);
          setSelectedWine(null);
          setScannedData(null);
          setScannedImage('');
        }}
        wine={selectedWine}
        scannedImage={scannedImage}
        scannedData={scannedData}
        onSave={handleSaveWine}
        onTriggerCamera={() => {
          setScannerMode('photo-only');
          setScannerOpen(true);
        }}
      />

      {/* REACTIVE TOAST OVERLAYS (Offline queue, background scans, PWA updates) */}
      <div className="fixed bottom-6 right-6 z-[1200] flex flex-col gap-3 w-full max-w-sm">
        
        {/* PWA Update Notice */}
        {needRefresh && (
          <div className="bg-[#12080a]/95 backdrop-blur-md border border-[#d4af37]/40 p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col gap-2.5 animate-slide-in">
            <div className="flex gap-2.5">
              <span className="text-base text-[#d4af37]">✨</span>
              <div className="flex-grow">
                <p className="text-xs font-bold text-[#f3e8eb]">Neue Version verfügbar!</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Eine aktualisierte Version von Vintory ist live.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-white transition-all bg-white/5 rounded-lg border border-white/5"
              >
                Später
              </button>
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 text-[10px] font-bold text-[#12080a] bg-[#d4af37] hover:bg-[#d4af37]/90 rounded-lg transition-all shadow-[0_2px_8px_rgba(212,175,55,0.3)]"
              >
                Aktualisieren
              </button>
            </div>
          </div>
        )}

        {/* Local notifications */}
        {notifications.map((msg, index) => (
          <div
            key={index}
            className="bg-[#1c2230]/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-start gap-2.5 animate-slide-in"
          >
            <span className="text-sm">🔔</span>
            <div className="flex-grow">
              <p className="text-xs font-semibold text-gray-200">{msg}</p>
            </div>
            <button
              onClick={() => removeNotification(index)}
              className="text-gray-500 hover:text-white transition-all text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        ))}

      </div>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <VintoryProvider>
      <VintoryAppContent />
    </VintoryProvider>
  );
};

export default App;
