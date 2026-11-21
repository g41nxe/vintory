import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Wine } from '../../core/entities/Wine';
import { IndexedDBWineRepository } from '../../infrastructure/db/IndexedDBWineRepository';
import { GeminiService, ScanError } from '../../core/services/GeminiService';
import { ImportMode, parseBackup, winesToAddOnMerge } from '../../core/services/backupImport';

export interface ImportPreview {
  wines: Wine[];
  /** Unusable entries in the file. */
  skipped: number;
  /** Wines in the file that are not in the cellar yet. */
  newCount: number;
  /** Wines in the file whose id already exists in the cellar. */
  alreadyPresentCount: number;
  /** Wines currently in the cellar. */
  currentCount: number;
}

const repository = new IndexedDBWineRepository();
const geminiService = new GeminiService();

const AUTO_RETRY_PAUSE_MS = 5 * 60 * 1000;

export interface QueueItem {
  id: string;
  frontImage: string;
  backImage: string | null;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
}

interface VintoryContextType {
  wines: Wine[];
  loading: boolean;
  saveWine: (wine: Wine) => Promise<void>;
  deleteWine: (id: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  /** Reads and validates a backup file without changing any data. Throws BackupFormatError. */
  readBackupFile: (file: File) => Promise<ImportPreview>;
  /** Writes previously read wines. Returns the number of wines written. */
  applyImport: (wines: Wine[], mode: ImportMode) => Promise<number>;
  
  // Offline scan queue & notifications
  queueItems: QueueItem[];
  onlineStatus: boolean;
  addScanToQueue: (frontImage: string, backImage: string | null) => Promise<void>;
  deleteQueueItem: (id: string) => Promise<void>;
  /** Processes pending scans. With retryFailed, previously failed scans are tried again too. */
  processQueue: (options?: { retryFailed?: boolean }) => Promise<void>;
  isProcessingQueue: boolean;
  notifications: string[];
  removeNotification: (index: number) => void;
}

const VintoryContext = createContext<VintoryContextType | undefined>(undefined);

export const VintoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Offline Scan Queue & Notifications states
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  // Synchronous lock: React state updates are async, so a state flag alone
  // cannot stop two processQueue calls that start at nearly the same time.
  const processingRef = useRef(false);
  // After a temporary error, automatic runs wait a bit instead of retrying right away.
  const autoPausedUntilRef = useRef(0);

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        // 1. Migrate old LocalStorage data if it exists
        const oldData = localStorage.getItem('vintory_wines');
        if (oldData) {
          try {
            const oldWines = JSON.parse(oldData);
            if (Array.isArray(oldWines) && oldWines.length > 0) {
              console.log(`Migrating ${oldWines.length} wines to IndexedDB...`);
              await repository.saveBatch(oldWines);
            }
            localStorage.removeItem('vintory_wines');
          } catch (err) {
            console.error("Migration error:", err);
          }
        }

        // 2. Load Wines
        // (The Gemini API key now lives only on the server, see netlify/functions.)
        const list = await repository.getAll();
        setWines(list);

        // 3. Load scan queue items.
        // Items still marked 'processing' were interrupted (tab closed mid-scan):
        // put them back to 'pending' so they are not stuck forever.
        const queueList = (await repository.getQueueItems()) as QueueItem[];
        const interrupted = queueList.filter((item) => item.status === 'processing');
        await Promise.all(interrupted.map((item) => repository.saveQueueItem({ ...item, status: 'pending' })));
        setQueueItems(interrupted.length > 0 ? await repository.getQueueItems() : queueList);
      } catch (err) {
        console.error("Vintory initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Monitor online status & trigger auto queue processor when online

  const saveWine = async (wine: Wine) => {
    await repository.save(wine);
    const list = await repository.getAll();
    setWines(list);
  };

  const deleteWine = async (id: string) => {
    await repository.delete(id);
    const list = await repository.getAll();
    setWines(list);
  };

  const downloadWinesAsBackup = (list: Wine[], fileSuffix = '') => {
    const dataStr = JSON.stringify(list, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vintory_backup_${new Date().toISOString().split('T')[0]}${fileSuffix}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke later: some browsers start the download asynchronously.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const exportBackup = async () => {
    downloadWinesAsBackup(await repository.getAll());
  };

  // Step 1 of an import: read + validate the file. Nothing is written yet.
  const readBackupFile = async (file: File): Promise<ImportPreview> => {
    const { wines: imported, skipped } = parseBackup(await file.text());
    const existing = await repository.getAll();
    const newCount = winesToAddOnMerge(existing, imported).length;
    return {
      wines: imported,
      skipped,
      newCount,
      alreadyPresentCount: imported.length - newCount,
      currentCount: existing.length,
    };
  };

  // Step 2 of an import: apply it in the mode the user chose.
  const applyImport = async (imported: Wine[], mode: ImportMode): Promise<number> => {
    const existing = await repository.getAll();
    let written: number;
    if (mode === 'replace') {
      // Safety net: download the current cellar before it gets replaced.
      if (existing.length > 0) {
        downloadWinesAsBackup(existing, '_vor_import');
      }
      await repository.saveBatch(imported);
      written = imported.length;
    } else {
      const toAdd = winesToAddOnMerge(existing, imported);
      await repository.saveMany(toAdd);
      written = toAdd.length;
    }
    setWines(await repository.getAll());
    return written;
  };

  // --- Offline queue management ---
  const addScanToQueue = async (frontImage: string, backImage: string | null) => {
    const newItem: QueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      frontImage,
      backImage,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await repository.saveQueueItem(newItem);
    const updated = await repository.getQueueItems();
    setQueueItems(updated);
    setNotifications(prev => [...prev, "Wein-Scan lokal in der Warteschlange gespeichert."]);
  };

  const deleteQueueItem = async (id: string) => {
    await repository.deleteQueueItem(id);
    const updated = await repository.getQueueItems();
    setQueueItems(updated);
  };

  // Processes the scan queue one item at a time.
  // - Automatic runs only take 'pending' items; 'failed' items are retried only
  //   when the user explicitly asks (retryFailed), so they don't burn scans.
  // - Temporary errors (offline, scan limit, server down) keep the item 'pending'
  //   and pause the run – retrying the rest right now would fail the same way.
  // - Permanent errors (unreadable label) mark the item 'failed'.
  const processQueue = useCallback(async ({ retryFailed = false }: { retryFailed?: boolean } = {}) => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;
    setIsProcessingQueue(true);

    let addedWines = 0;
    try {
      const items = (await repository.getQueueItems()) as QueueItem[];
      const todo = items
        .filter((item) => item.status === 'pending' || (retryFailed && item.status === 'failed'))
        .sort((a, b) => a.timestamp - b.timestamp);

      for (const item of todo) {
        await repository.saveQueueItem({ ...item, status: 'processing' });

        let wineData;
        try {
          wineData = await geminiService.analyzeLabel(item.frontImage, item.backImage || undefined);
        } catch (err) {
          console.error(`Failed to process queue item ${item.id}:`, err);
          if (err instanceof ScanError && err.retryable) {
            await repository.saveQueueItem({ ...item, status: 'pending' });
            autoPausedUntilRef.current = Date.now() + AUTO_RETRY_PAUSE_MS;
            setNotifications((prev) => [
              ...prev,
              err.limitReached
                ? `Warteschlange pausiert: ${err.message}`
                : 'Warteschlange pausiert – der Scan-Dienst ist gerade nicht erreichbar. Deine Scans bleiben gespeichert.',
            ]);
            break;
          }
          await repository.saveQueueItem({ ...item, status: 'failed' });
          setNotifications((prev) => [
            ...prev,
            'Ein gespeicherter Scan konnte nicht ausgewertet werden. Tippe auf „Warteschlange“, um es erneut zu versuchen.',
          ]);
          continue;
        }

        const newWine: Wine = {
          id: Math.random().toString(36).substring(2, 9),
          name: wineData.name || 'Unbekannter Wein',
          type: wineData.type || 'Rotwein',
          year: wineData.year || null,
          winery: wineData.winery || 'Unbekanntes Weingut',
          region: wineData.region || 'Region unbekannt',
          grape: wineData.grape || '',
          price: wineData.suggestedPrice || '',
          quantity: 1,
          rating: 3,
          image: item.frontImage,
          isFavorite: false,
        };

        await repository.save(newWine);
        await repository.deleteQueueItem(item.id);
        addedWines++;

        setNotifications((prev) => [
          ...prev,
          `Hintergrund-Scan erfolgreich! "${newWine.name}" wurde in deinen Keller gelegt.`,
        ]);
      }
    } catch (err) {
      console.error('Processing the scan queue failed:', err);
    } finally {
      setQueueItems(await repository.getQueueItems());
      if (addedWines > 0) {
        setWines(await repository.getAll());
      }
      processingRef.current = false;
      setIsProcessingQueue(false);
    }
  }, []);

  // Online/offline handling: resume the queue when the connection comes back.
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      setNotifications((prev) => [...prev, 'Verbindung wiederhergestellt! Verarbeite Warteschlange...']);
      processQueue();
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      setNotifications((prev) => [...prev, 'Offline-Modus aktiv. Scans werden lokal gespeichert.']);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  // Process automatically after start-up and whenever new pending scans are added.
  // Depends on the pending count only, so a paused run (items stay pending) does not loop.
  const pendingCount = queueItems.filter((item) => item.status === 'pending').length;
  useEffect(() => {
    if (!loading && pendingCount > 0 && navigator.onLine && Date.now() >= autoPausedUntilRef.current) {
      processQueue();
    }
  }, [loading, pendingCount, processQueue]);

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <VintoryContext.Provider value={{
      wines,
      loading,
      saveWine,
      deleteWine,
      exportBackup,
      readBackupFile,
      applyImport,
      
      queueItems,
      onlineStatus,
      addScanToQueue,
      deleteQueueItem,
      processQueue,
      isProcessingQueue,
      notifications,
      removeNotification
    }}>
      {children}
    </VintoryContext.Provider>
  );
};

export const useVintory = () => {
  const context = useContext(VintoryContext);
  if (context === undefined) {
    throw new Error('useVintory must be used within a VintoryProvider');
  }
  return context;
};
