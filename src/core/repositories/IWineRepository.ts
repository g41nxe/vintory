import { Wine } from '../entities/Wine';

export interface IWineRepository {
  getAll(): Promise<Wine[]>;
  save(wine: Wine): Promise<void>;
  delete(id: string): Promise<void>;
  saveBatch(wines: Wine[]): Promise<void>;
  getSetting(key: string): Promise<string>;
  saveSetting(key: string, value: string): Promise<void>;
}
