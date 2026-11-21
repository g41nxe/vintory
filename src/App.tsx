import React, { useState, useMemo, useRef } from 'react';
import { useVintory, VintoryProvider, ImportPreview } from './ui/context/VintoryContext';
import { ImportModal } from './ui/components/ImportModal';
import { MerchantCleanupModal } from './ui/components/MerchantCleanupModal';
import { isMerchantCleanupDone, markMerchantCleanupDone } from './ui/preferences';
import { BackupFormatError, ImportMode } from './core/services/backupImport';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WineCard } from './ui/components/WineCard';
import { ScannerModal } from './ui/components/ScannerModal';
import { WineModal } from './ui/components/WineModal';
import { FilterModal } from './ui/components/FilterModal';
import { Wine, DEFAULT_TAGS, isOwned } from './core/entities/Wine';
import { OwnedFilter } from './ui/components/FilterModal';
import { priceValue } from './core/entities/price';
import { ExtractedWineData } from './core/services/GeminiService';
import { 
  Camera,
  Plus,
  Search, 
  Filter, 
  Download, 
  Upload, 
  Wine as WineIcon, 
  TrendingUp, 
  Heart,
  Database,
  Store
} from 'lucide-react';

const VintoryAppContent: React.FC = () => {
  const {
    wines,
    loading,
    saveWine,
    deleteWine,
    exportBackup,
    readBackupFile,
    applyImport,
    moveWineriesToMerchant,

    // Offline scan queue & notifications
    queueItems,
    onlineStatus,
    processQueue,
    isProcessingQueue,
    notifications,
    removeNotification
  } = useVintory();

  const failedQueueCount = queueItems.filter((item) => item.status === 'failed').length;

  // PWA SW Register Hook for prompt updates
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('Vintory SW Registered:', r);
    },
    onRegisterError(error: unknown) {
      console.error('Vintory SW Register Error:', error);
    }
  });

  // Search, Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Alle');
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('all');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name-asc');
  const filtersActive =
    typeFilter !== 'Alle' || ownedFilter !== 'all' || merchantFilter !== '' || tagFilter.length > 0 || sortBy !== 'name-asc';

  // Modal open states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [wineModalOpen, setWineModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  // „Händler aufräumen“ is a one-off: hidden for good once it was used on this device.
  const [cleanupDone, setCleanupDone] = useState(isMerchantCleanupDone);
  const hasMerchantCleanupCandidates =
    !cleanupDone && wines.some((w) => w.winery.trim() && !w.merchant.trim());

  const handleMerchantCleanup = async (wineries: string[]) => {
    const changed = await moveWineriesToMerchant(wineries);
    markMerchantCleanupDone();
    setCleanupDone(true);
    return changed;
  };

  // Scanner operation mode: 'ocr' (read label) or 'photo-only' (just snapping cover photo)
  const [scannerMode, setScannerMode] = useState<'ocr' | 'photo-only'>('ocr');

  // Modal edit/scanned details states
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [scannedImage, setScannedImage] = useState('');
  const [scannedData, setScannedData] = useState<Partial<Wine> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

  // Merchants with wine count (most frequent first) and tags in use – for the filter dialog.
  const merchants = useMemo(() => {
    const counts = new Map<string, number>();
    wines.forEach((w) => {
      const m = w.merchant.trim();
      if (m) counts.set(m, (counts.get(m) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [wines]);

  const tagsInUse = useMemo(() => {
    const used = new Set<string>();
    wines.forEach((w) => w.tags.forEach((t) => used.add(t)));
    const defaults = DEFAULT_TAGS.filter((t) => used.has(t));
    const custom = [...used].filter((t) => !(DEFAULT_TAGS as readonly string[]).includes(t)).sort((a, b) => a.localeCompare(b));
    return [...defaults, ...custom];
  }, [wines]);

  // --- Search & Filter Logic ---
  const filteredWines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return wines.filter((wine) => {
      const matchesSearch =
        !term ||
        [wine.name, wine.winery, wine.merchant, wine.region, wine.grape, wine.comment, ...wine.tags].some((field) =>
          field.toLowerCase().includes(term)
        );
      const matchesType = typeFilter === 'Alle' || wine.type === typeFilter;
      const matchesOwned =
        ownedFilter === 'all' || (ownedFilter === 'owned' ? isOwned(wine) : !isOwned(wine));
      const matchesMerchant = !merchantFilter || wine.merchant.trim() === merchantFilter;
      const matchesTags = tagFilter.every((t) => wine.tags.includes(t));

      return matchesSearch && matchesType && matchesOwned && matchesMerchant && matchesTags;
    });
  }, [wines, searchTerm, typeFilter, ownedFilter, merchantFilter, tagFilter]);

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
        case 'tasted-desc':
          // Newest tasting first, wines without a date at the end.
          return (b.tastedAt || '').localeCompare(a.tastedAt || '');
        case 'qty-desc':
          return b.quantity - a.quantity;
        case 'price-desc':
          // Ranges count with their midpoint, "12,50" with its decimals.
          return priceValue(b.price) - priceValue(a.price);
        default:
          return 0;
      }
    });
    return list;
  }, [filteredWines, sortBy]);

  // --- Real-time statistics calculations ---
  const stats = useMemo(() => {
    const owned = wines.filter(isOwned);
    // Value only counts wines in possession (price × bottles).
    const ownedValue = owned.reduce((sum, w) => sum + priceValue(w.price) * w.quantity, 0);

    return {
      totalWines: wines.length,
      totalOwned: owned.length,
      totalBottles: owned.reduce((sum, w) => sum + w.quantity, 0),
      totalFavorites: wines.filter((w) => w.isFavorite).length,
      ownedValue: ownedValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }, [wines]);

  // --- Action Handlers ---
  const handleUpdateQuantity = async (wine: Wine, newQty: number) => {
    await saveWine({ ...wine, quantity: newQty });
  };

  const handleToggleFavorite = async (wine: Wine) => {
    await saveWine({ ...wine, isFavorite: !wine.isFavorite });
  };

  // Deleting can't be undone and data lives only on this device (ADR 0003): always ask first.
  const handleDeleteWine = async (id: string) => {
    const wine = wines.find((w) => w.id === id);
    const label = wine?.name ? `„${wine.name}“` : 'Diesen Wein';
    if (!window.confirm(`${label} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
    await deleteWine(id);
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
      if (ocrData) {
        setScannedData({
          name: ocrData.name,
          type: ocrData.type,
          year: ocrData.year,
          winery: ocrData.winery,
          region: ocrData.region,
          grape: ocrData.grape,
          price: ocrData.suggestedPrice || ''
        });
      } else {
        setScannedData(null);
      }
      setScannedImage(imageBase64);
      setWineModalOpen(true);
    }
  };

  const handleSaveWine = async (updatedWine: Wine) => {
    await saveWine(updatedWine);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again triggers onChange.
    e.target.value = '';
    if (!file) return;
    try {
      // Only reads and validates – nothing is changed until the user confirms.
      setImportPreview(await readBackupFile(file));
    } catch (err) {
      console.error('Backup could not be read:', err);
      alert(
        err instanceof BackupFormatError
          ? `Backup kann nicht importiert werden: ${err.message}`
          : 'Die Datei konnte nicht gelesen werden.'
      );
    }
  };

  const handleConfirmImport = async (mode: ImportMode) => {
    if (!importPreview) return;
    try {
      const written = await applyImport(importPreview.wines, mode);
      setImportPreview(null);
      alert(
        mode === 'replace'
          ? `Weinliste ersetzt: ${written} ${written === 1 ? 'Wein' : 'Weine'} aus dem Backup übernommen.`
          : `${written} ${written === 1 ? 'Wein' : 'Weine'} hinzugefügt. Vorhandene Weine wurden nicht verändert.`
      );
    } catch (err) {
      console.error('Backup import failed:', err);
      alert('Import fehlgeschlagen. Deine Weinliste wurde nicht verändert.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0506] flex flex-col items-center justify-center gap-4 text-white">
        <div className="loading-ring w-12 h-12" />
        <p className="text-sm font-semibold tracking-widest text-[#d4af37] uppercase animate-pulse">
          Vintory wird entkorkt...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 md:px-8 py-8 min-h-screen flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🍷</span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#d4af37] bg-clip-text text-transparent">
              Vintory
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            Dein Verkostungstagebuch und Weinkeller
          </p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto justify-end">
          {/* Offline Scan Queue Badge */}
          {queueItems.length > 0 && (
            <button
              onClick={() => processQueue({ retryFailed: true })}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl animate-pulse cursor-pointer shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:animate-none"
              title={
                isProcessingQueue
                  ? 'Scans werden gerade ausgewertet...'
                  : failedQueueCount > 0
                    ? `${queueItems.length} Scans gespeichert, davon ${failedQueueCount} fehlgeschlagen. Klicken, um alle erneut zu versuchen.`
                    : `${queueItems.length} Scans ausstehend. Klicken zum manuellen Synchronisieren.`
              }
              disabled={!onlineStatus || isProcessingQueue}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              {isProcessingQueue ? 'Wird ausgewertet...' : `Warteschlange (${queueItems.length})`}
              {!isProcessingQueue && failedQueueCount > 0 && (
                <span className="text-red-400">· {failedQueueCount} fehlgeschlagen</span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* UNIFIED SEARCH & ACTION TOOLBAR */}
      <section className="bg-[#1c2230]/40 border border-white/5 p-3 rounded-2xl flex items-center gap-2">
        {/* Search Input Box */}
        <div className="relative flex items-center flex-grow min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Suchen nach Name, Weingut..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3.5 text-[#f3e8eb] text-sm focus:border-[#8c1c2e] outline-none transition-all placeholder:text-gray-500"
          />
        </div>

        {/* Filter & Sort Button */}
        <button
          onClick={() => setFilterModalOpen(true)}
          className={`relative flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#f3e8eb] cursor-pointer transition-all shrink-0 ${
            filtersActive ? 'border-[#d4af37]/45 text-[#d4af37]' : ''
          }`}
          title="Filter & Sortierung öffnen"
        >
          <Filter className="w-5 h-5" />
          {/* Active Filter Indicator */}
          {filtersActive && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#d4af37] border border-[#12080a] rounded-full animate-pulse" />
          )}
        </button>

        {/* Scanner Button */}
        <button
          onClick={() => {
            setScannerMode('ocr');
            setScannerOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#8c1c2e] hover:bg-[#8c1c2e]/90 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(140,28,46,0.3)] cursor-pointer shrink-0"
          title="Weinetikett einscannen"
        >
          <Camera className="w-5 h-5" />
          <span className="hidden sm:inline">Scanner</span>
        </button>

        {/* Add Manual Button */}
        <button
          onClick={handleAddWineManual}
          className="flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all cursor-pointer shrink-0"
          title="Wein manuell hinzufügen"
        >
          <Plus className="w-5 h-5" />
        </button>

      </section>

      {/* THE VIRTUAL SHELF GRID */}
      <main className="flex-grow min-h-[50vh]">
        {sortedWines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 py-6 relative">
            {sortedWines.map((wine) => (
              <WineCard
                key={wine.id}
                wine={wine}
                onEdit={handleEditWine}
                onDelete={handleDeleteWine}
                onUpdateQuantity={handleUpdateQuantity}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center gap-4 mt-6">
            <span className="text-5xl">🍷</span>
            <div>
              <h3 className="text-lg font-bold text-white">Deine Weinliste ist noch leer</h3>
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
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Weine</p>
            <h4 className="text-lg font-bold text-white">{stats.totalWines}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl text-[#d4af37]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Im Besitz</p>
            <h4 className="text-lg font-bold text-white">{stats.totalOwned}{stats.totalBottles > stats.totalOwned && <span className="text-xs text-gray-400 font-semibold"> · {stats.totalBottles} Fl.</span>}</h4>
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
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Wert im Besitz</p>
            <h4 className="text-lg font-bold text-[#d4af37]">{stats.ownedValue} €</h4>
          </div>
        </div>

      </footer>

      {/* UTILITY FOOTER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5 text-xs text-gray-500 mt-2">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>
            Created by{' '}
            <a href="https://github.com/g41nxe" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#d4af37] underline underline-offset-2">g41nxe</a>
          </span>
          <span aria-hidden="true">·</span>
          <a href="/datenschutz.html" className="text-gray-400 hover:text-[#d4af37] underline underline-offset-2">Datenschutz</a>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {hasMerchantCleanupCandidates && (
            <button
              onClick={() => setCleanupOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-[#d4af37] transition-all cursor-pointer"
              title="Händler, die unter „Weingut“ stehen, ins Feld „Händler“ verschieben"
            >
              <Store className="w-3.5 h-3.5" />
              Händler aufräumen
            </button>
          )}

          <button
            onClick={exportBackup}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer"
            title="Backup der Weinliste herunterladen"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer"
            title="Backup der Weinliste hochladen"
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
      </div>

      {/* ALL MODAL WINDOWS */}
      <MerchantCleanupModal
        isOpen={cleanupOpen}
        wines={wines}
        onClose={() => setCleanupOpen(false)}
        onConfirm={handleMerchantCleanup}
      />

      <ImportModal
        preview={importPreview}
        onCancel={() => setImportPreview(null)}
        onConfirm={handleConfirmImport}
      />

      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        ownedFilter={ownedFilter}
        setOwnedFilter={setOwnedFilter}
        merchantFilter={merchantFilter}
        setMerchantFilter={setMerchantFilter}
        merchants={merchants}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        availableTags={tagsInUse}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        mode={scannerMode}
        onScanComplete={handleScanComplete}
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
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto z-[1200] flex flex-col gap-3 w-auto sm:w-full sm:max-w-sm">
        
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
