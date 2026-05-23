import React, { createContext, useContext, useState, useEffect } from 'react';
import { Wine } from '../../core/entities/Wine';
import { IndexedDBWineRepository } from '../../infrastructure/db/IndexedDBWineRepository';
import { parseEnv } from '../../v1_backup/main.js'; // Wait, let's keep env Config inline or separate

const repository = new IndexedDBWineRepository();

interface VintoryContextType {
  wines: Wine[];
  apiKey: string;
  loading: boolean;
  saveWine: (wine: Wine) => Promise<void>;
  deleteWine: (id: string) => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<boolean>;
}

const VintoryContext = createContext<VintoryContextType | undefined>(undefined);

export const VintoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

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

        // 2. Load API Key (Priority: config.js window global > local .env > IndexedDB)
        let key = '';
        const globalConfig = (window as any).VINTORY_CONFIG;
        if (globalConfig && globalConfig.GEMINI_API_KEY) {
          key = globalConfig.GEMINI_API_KEY;
        }

        if (!key) {
          key = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
        }

        if (!key) {
          key = await repository.getSetting('gemini_api_key');
        }
        setApiKey(key);

        // 3. Load Wines
        const list = await repository.getAll();
        setWines(list);
      } catch (err) {
        console.error("Vintory initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

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

  const saveApiKey = async (key: string) => {
    await repository.saveSetting('gemini_api_key', key);
    setApiKey(key);
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

  return (
    <VintoryContext.Provider value={{
      wines,
      apiKey,
      loading,
      saveWine,
      deleteWine,
      saveApiKey,
      exportBackup,
      importBackup
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
