import { Wine, generateWineId, withWineDefaults } from '../entities/Wine';

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

/**
 * Turns one backup entry into a valid Wine, or null if it is unusable.
 * Missing fields get defaults, so backups from older app versions (or
 * hand-edited files) still import.
 */
const normalizeBackupEntry = (entry: unknown): Wine | null => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const wine = withWineDefaults(entry as Record<string, unknown>);
  wine.name = wine.name.trim();
  wine.winery = wine.winery.trim();
  if (!wine.name && !wine.winery) return null;
  return wine;
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
    const wine = normalizeBackupEntry(entry);
    if (!wine) {
      skipped++;
      continue;
    }
    // Duplicate ids inside one file would silently overwrite each other.
    if (seenIds.has(wine.id)) {
      wine.id = generateWineId();
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
 * the list yet – so restoring an older backup can never overwrite newer data.
 */
export const winesToAddOnMerge = (existing: Wine[], imported: Wine[]): Wine[] => {
  const existingIds = new Set(existing.map((w) => w.id));
  return imported.filter((w) => !existingIds.has(w.id));
};
