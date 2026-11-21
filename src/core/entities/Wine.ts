export interface Wine {
  id: string;
  name: string;
  type: string;
  year: number | null;
  /** Erzeuger (Weingut). */
  winery: string;
  region: string;
  grape: string;
  price: string;
  /** Anzahl Flaschen. „Im Besitz“ = quantity > 0 (ADR 0004). */
  quantity: number;
  rating: number;
  image: string;
  isFavorite: boolean;
  /** Wo der Wein gekauft oder probiert wurde. Nie das Weingut. */
  merchant: string;
  comment: string;
  /** Schlagwörter, z. B. „mineralisch“. */
  tags: string[];
  /** Verkostet am, als ISO-Datum YYYY-MM-DD. */
  tastedAt: string | null;
}

export const WINE_TYPES = ['Rotwein', 'Weißwein', 'Rosé', 'Schaumwein'] as const;

export const DEFAULT_TAGS = [
  'trocken',
  'halbtrocken',
  'süß',
  'fruchtig',
  'mineralisch',
  'frisch',
  'kräftig',
  'leicht',
  'holzig',
  'würzig',
  'tanninreich',
  'elegant',
] as const;

export const isOwned = (wine: Pick<Wine, 'quantity'>): boolean => wine.quantity > 0;

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit. */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const generateWineId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

const asNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const asIsoDate = (value: unknown): string | null => {
  const s = asString(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const asTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const tags = value.map((t) => asString(t).trim()).filter(Boolean);
  return Array.from(new Set(tags));
};

/**
 * Makes a stored or imported record usable as a Wine. Used when reading stored
 * wines (older app versions lack merchant, comment, tags and tastedAt; v1 stored
 * the year as text) and when importing backups. Only changes the in-memory object –
 * nothing is written back by itself (ADR 0003). Rules, because the result is what
 * gets written the next time the wine is saved:
 * - unknown extra fields are kept unchanged,
 * - valid values are kept as they are; only missing/unusable values get a default,
 * - type conversions are lossless („2018“ → 2018, 45 → „45“).
 */
export const withWineDefaults = (raw: Record<string, unknown>): Wine => {
  const yearNumber = raw.year === null || raw.year === undefined || raw.year === '' ? null : asNumber(raw.year, NaN);
  const quantity = asNumber(raw.quantity, 1);
  return {
    ...raw,
    id: asString(raw.id).trim() || generateWineId(),
    name: asString(raw.name),
    type: asString(raw.type) || 'Rotwein',
    year: yearNumber !== null && Number.isFinite(yearNumber) ? yearNumber : null,
    winery: asString(raw.winery),
    region: asString(raw.region),
    grape: asString(raw.grape),
    price: asString(raw.price),
    quantity: quantity >= 0 ? quantity : 0,
    rating: asNumber(raw.rating, 3),
    image: asString(raw.image),
    isFavorite: raw.isFavorite === true || raw.isFavorite === 'true',
    merchant: asString(raw.merchant),
    comment: asString(raw.comment),
    tags: asTags(raw.tags),
    tastedAt: asIsoDate(raw.tastedAt),
  };
};
