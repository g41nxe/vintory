import { Wine } from '../../core/entities/Wine';
import { IWineRepository } from '../../core/repositories/IWineRepository';

export class IndexedDBWineRepository implements IWineRepository {
  private db: IDBDatabase | null = null;
  private dbName = 'VintoryDB';
  private dbVersion = 2;

  private initDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('wines')) {
          db.createObjectStore('wines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('scanQueue')) {
          db.createObjectStore('scanQueue', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(new Error(`Database opening error: ${request.error?.message}`));
      };
    });
  }

  async getAll(): Promise<Wine[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('wines', 'readonly');
      const store = transaction.objectStore('wines');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as Wine[]);
      request.onerror = () => reject(request.error);
    });
  }

  async save(wine: Wine): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('wines', 'readwrite');
      const store = transaction.objectStore('wines');
      const request = store.put(wine);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('wines', 'readwrite');
      const store = transaction.objectStore('wines');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveBatch(wines: Wine[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('wines', 'readwrite');
      const store = transaction.objectStore('wines');
      const clearReq = store.clear();

      clearReq.onsuccess = () => {
        if (wines.length === 0) {
          resolve();
          return;
        }
        let completed = 0;
        let failed = false;

        wines.forEach((wine) => {
          const req = store.put(wine);
          req.onsuccess = () => {
            completed++;
            if (completed === wines.length && !failed) {
              resolve();
            }
          };
          req.onerror = () => {
            failed = true;
            reject(req.error);
          };
        });
      };

      clearReq.onerror = () => reject(clearReq.error);
    });
  }

  async saveMany(wines: Wine[]): Promise<void> {
    if (wines.length === 0) return;
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      // One transaction: either all wines are written or none (aborts on error).
      const transaction = db.transaction('wines', 'readwrite');
      const store = transaction.objectStore('wines');
      wines.forEach((wine) => store.put(wine));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async getSetting(key: string): Promise<string> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as string) || '');
      request.onerror = () => reject(request.error);
    });
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Scan Queue Management ---
  async getQueueItems(): Promise<any[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scanQueue', 'readonly');
      const store = transaction.objectStore('scanQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveQueueItem(item: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scanQueue', 'readwrite');
      const store = transaction.objectStore('scanQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteQueueItem(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scanQueue', 'readwrite');
      const store = transaction.objectStore('scanQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
