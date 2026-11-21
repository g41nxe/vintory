import { Wine } from '../entities/Wine';

export interface IWineRepository {
  getAll(): Promise<Wine[]>;
  save(wine: Wine): Promise<void>;
  delete(id: string): Promise<void>;
  /** Replaces ALL wines with the given list (clears the store first). */
  saveBatch(wines: Wine[]): Promise<void>;
  /** Adds/updates the given wines in one transaction, leaving all others untouched. */
  saveMany(wines: Wine[]): Promise<void>;
  getSetting(key: string): Promise<string>;
  saveSetting(key: string, value: string): Promise<void>;
}
