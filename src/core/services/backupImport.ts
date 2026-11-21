import { Wine } from '../entities/Wine';

export type ImportMode = 'merge' | 'replace';

export interface ParsedBackup {
  /** Valid, normalized wines from the file. */
  wines: Wine[];
  /** Entries that could not be used (not an object, or neither name nor winery). */
  skipped: number;
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

const asNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11);

/**
 * Turns one backup entry into a valid Wine, or null if it is unusable.
 * Missing fields get the same defaults the app uses for new wines, so backups
 * from older app versions (or hand-edited files) still import.
 */
const normalizeWine = (entry: unknown): Wine | null => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const raw = entry as Record<string, unknown>;

  const name = asString(raw.name).trim();
  const winery = asString(raw.winery).trim();
  if (!name && !winery) return null;

  const year = raw.year === null || raw.year === undefined || raw.year === '' ? null : asNumber(raw.year, NaN);

  return {
    id: asString(raw.id).trim() || generateId(),
    name,
    type: asString(raw.type) || 'Rotwein',
    year: year !== null && Number.isFinite(year) ? Math.round(year) : null,
    winery,
    region: asString(raw.region),
    grape: asString(raw.grape),
    price: asString(raw.price),
    quantity: Math.max(0, Math.round(asNumber(raw.quantity, 1))),
    rating: Math.min(5, Math.max(0, asNumber(raw.rating, 3))),
    image: asString(raw.image),
    isFavorite: raw.isFavorite === true,
  };
};

/** Parses the text of a Vintory backup file (JSON array of wines, as written by the export). */
export const parseBackup = (text: string): ParsedBackup => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFormatError('Die Datei ist kein gültiges JSON.');
  }
  if (!Array.isArray(data)) {
    throw new BackupFormatError('Die Datei ist kein Vintory-Backup (erwartet wird eine Liste von Weinen).');
  }

  const wines: Wine[] = [];
  const seenIds = new Set<string>();
  let skipped = 0;
  for (const entry of data) {
    const wine = normalizeWine(entry);
    if (!wine) {
      skipped++;
      continue;
    }
    // Duplicate ids inside one file would silently overwrite each other.
    if (seenIds.has(wine.id)) {
      wine.id = generateId();
    }
    seenIds.add(wine.id);
    wines.push(wine);
  }

  if (wines.length === 0) {
    throw new BackupFormatError('Das Backup enthält keine gültigen Weine.');
  }
  return { wines, skipped };
};

/**
 * Merge keeps every existing wine unchanged and only adds wines whose id is not in
 * the cellar yet – so restoring an older backup can never overwrite newer data.
 */
export const winesToAddOnMerge = (existing: Wine[], imported: Wine[]): Wine[] => {
  const existingIds = new Set(existing.map((w) => w.id));
  return imported.filter((w) => !existingIds.has(w.id));
};
