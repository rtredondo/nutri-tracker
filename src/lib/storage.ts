import type { Food, LogEntry } from './nutrients';

const CACHE_KEYS = {
  BASE_DATA: 'nutri_base_data',
  BASE_DATA_TS: 'nutri_base_data_ts',
  DAY_EDIT: (date: string) => `nutri_edit_${date}`,
  SETTINGS: 'nutri_settings',
  MEAL_COLLAPSE: (date: string) => `nutri_meal_collapse_${date}`,
};

interface CachedBaseData {
  foods: Food[];
  cardapio: LogEntry[];
  timestamp: number;
}

export function cacheBaseData(foods: Food[], cardapio: LogEntry[]): void {
  const data: CachedBaseData = {
    foods,
    cardapio,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEYS.BASE_DATA, JSON.stringify(data));
}

export function getCachedBaseData(): CachedBaseData | null {
  const cached = localStorage.getItem(CACHE_KEYS.BASE_DATA);
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function isCacheStale(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const cached = getCachedBaseData();
  if (!cached) return true;
  return Date.now() - cached.timestamp > maxAgeMs;
}

export function clearBaseDataCache(): void {
  localStorage.removeItem(CACHE_KEYS.BASE_DATA);
  localStorage.removeItem(CACHE_KEYS.BASE_DATA_TS);
}

export function cacheDayEdits(date: string, entries: LogEntry[]): void {
  localStorage.setItem(CACHE_KEYS.DAY_EDIT(date), JSON.stringify(entries));
}

export function getCachedDayEdits(date: string): LogEntry[] | null {
  const cached = localStorage.getItem(CACHE_KEYS.DAY_EDIT(date));
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function clearDayEdits(date: string): void {
  localStorage.removeItem(CACHE_KEYS.DAY_EDIT(date));
}

export interface Settings {
  calorieTarget: number;
  proteinTargetG?: number;
}

const DEFAULT_SETTINGS: Settings = {
  calorieTarget: 2780,
};

export function getSettings(): Settings {
  const cached = localStorage.getItem(CACHE_KEYS.SETTINGS);
  if (!cached) return DEFAULT_SETTINGS;

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function getMealCollapseState(date: string): Record<string, boolean> {
  const cached = localStorage.getItem(CACHE_KEYS.MEAL_COLLAPSE(date));
  if (!cached) return {};

  try {
    return JSON.parse(cached);
  } catch {
    return {};
  }
}

export function saveMealCollapseState(date: string, state: Record<string, boolean>): void {
  localStorage.setItem(CACHE_KEYS.MEAL_COLLAPSE(date), JSON.stringify(state));
}
