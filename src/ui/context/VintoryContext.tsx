import React, { createContext, useContext, useState, useEffect } from 'react';
import { Wine } from '../../core/entities/Wine';
import { IndexedDBWineRepository } from '../../infrastructure/db/IndexedDBWineRepository';
import { GeminiService } from '../../core/services/GeminiService';

const repository = new IndexedDBWineRepository();
const geminiService = new GeminiService();

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
  importBackup: (file: File) => Promise<boolean>;
  
  // Offline scan queue & notifications
  queueItems: QueueItem[];
  onlineStatus: boolean;
  addScanToQueue: (frontImage: string, backImage: string | null) => Promise<void>;
  deleteQueueItem: (id: string) => Promise<void>;
  processQueue: () => Promise<void>;
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

        // 3. Load scan queue items
        const queueList = await repository.getQueueItems();
        setQueueItems(queueList);
      } catch (err) {
        console.error("Vintory initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Monitor online status & trigger auto queue processor when online
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      setNotifications(prev => [...prev, "Verbindung wiederhergestellt! Verarbeite Warteschlange..."]);
      processQueue();
    };
    
    const handleOffline = () => {
      setOnlineStatus(false);
      setNotifications(prev => [...prev, "Offline-Modus aktiv. Scans werden lokal gespeichert."]);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine && queueItems.length > 0) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queueItems.length]);

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

  const exportBackup = async () => {
    const list = await repository.getAll();
    const dataStr = JSON.stringify(list, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vintory_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const list = JSON.parse(content);
          if (Array.isArray(list)) {
            await repository.saveBatch(list);
            const updated = await repository.getAll();
            setWines(updated);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.error("Backup import error:", err);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
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

  const processQueue = async () => {
    // Avoid double processing, and require an online status
    if (isProcessingQueue || !navigator.onLine) return;
    
    const items = await repository.getQueueItems();
    if (items.length === 0) return;
    
    setIsProcessingQueue(true);
    console.log(`Processing scan queue of ${items.length} items...`);
    
    for (const item of items) {
      try {
        // Update state status to processing
        await repository.saveQueueItem({ ...item, status: 'processing' });
        
        const wineData = await geminiService.analyzeLabel(item.frontImage, item.backImage || undefined);
        
        // Save the newly analyzed wine!
        const newWine: Wine = {
          id: Math.random().toString(36).substring(2, 9),
          name: wineData.name || 'Unbekannter Wein',
          type: (wineData.type as any) || 'Rotwein',
          year: wineData.year || null,
          winery: wineData.winery || 'Unbekanntes Weingut',
          region: wineData.region || 'Region unbekannt',
          grape: wineData.grape || '',
          price: wineData.suggestedPrice || '',
          quantity: 1,
          rating: 3,
          image: item.frontImage,
          isFavorite: false
        };
        
        await repository.save(newWine);
        await repository.deleteQueueItem(item.id);
        
        setNotifications(prev => [
          ...prev, 
          `Hintergrund-Scan erfolgreich! "${newWine.name}" wurde in deinen Keller gelegt.`
        ]);
        
      } catch (err) {
        console.error(`Failed to process queue item ${item.id}:`, err);
        // Mark as failed so we don't try in an infinite loop
        await repository.saveQueueItem({ ...item, status: 'failed' });
      }
    }
    
    // Refresh states
    const updatedQueue = await repository.getQueueItems();
    setQueueItems(updatedQueue);
    
    const updatedWines = await repository.getAll();
    setWines(updatedWines);
    
    setIsProcessingQueue(false);
  };

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
      importBackup,
      
      queueItems,
      onlineStatus,
      addScanToQueue,
      deleteQueueItem,
      processQueue,
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
