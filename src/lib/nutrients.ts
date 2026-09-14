export type Nutrient = 'kcal' | 'protein_g' | 'fat_g' | 'sat_fat_g' | 'carbs_g' | 'sugars_g' | 'fibre_g' | 'salt_g';

export const PRIMARY_NUTRIENTS: Nutrient[] = ['kcal', 'protein_g', 'fat_g', 'carbs_g'];
export const SECONDARY_NUTRIENTS: Nutrient[] = ['sat_fat_g', 'sugars_g', 'fibre_g', 'salt_g'];
export const ALL_NUTRIENTS: Nutrient[] = [...PRIMARY_NUTRIENTS, ...SECONDARY_NUTRIENTS];

export interface Food {
  food_id: string;
  food_name: string;
  category: string;
  source: string;
  basis_qty: number;
  basis_unit: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  salt_g: number | null;
  notes?: string;
}

export interface LogEntry {
  meal: string;
  food_id: string;
  food_name: string;
  qty: number;
  unit: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  salt_g: number | null;
}

export function coerceNutrient(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function coerceBasisQty(food: Food): number {
  const coerced = coerceNutrient(food.basis_qty);
  if (coerced === null || coerced === 0) {
    return 100;
  }
  return coerced;
}

export function computeNutrient(food: Food, nutrient: Nutrient, quantity: number): number | null {
  const baseValue = food[nutrient];
  const coerced = coerceNutrient(baseValue);
  if (coerced === null) return null;

  const basisQty = coerceBasisQty(food);
  return (coerced * quantity) / basisQty;
}

export function sumNutrients(entries: LogEntry[], nutrient: Nutrient): { total: number | null; coverage: number } {
  if (entries.length === 0) return { total: null, coverage: 100 };

  let sum: number | null = null;
  let countWithData = 0;

  for (const entry of entries) {
    const value = entry[nutrient];
    if (value !== null && Number.isFinite(value)) {
      sum = (sum ?? 0) + value;
      countWithData++;
    }
  }

  const coverage = Math.round((countWithData / entries.length) * 100);
  return { total: sum, coverage };
}

export function formatNutrient(value: number | null, nutrient: Nutrient, coverage: number): string {
  if (value === null) return '—';

  let unit = '';
  switch (nutrient) {
    case 'kcal': unit = ''; break;
    case 'protein_g': unit = ' g'; break;
    case 'fat_g': unit = ' g'; break;
    case 'sat_fat_g': unit = ' g'; break;
    case 'carbs_g': unit = ' g'; break;
    case 'sugars_g': unit = ' g'; break;
    case 'fibre_g': unit = ' g'; break;
    case 'salt_g': unit = ' g'; break;
  }

  const formatted = value.toFixed(1);
  if (coverage < 100) {
    return `${formatted}${unit} · ${coverage}%`;
  }
  return `${formatted}${unit}`;
}

export function caloriesFromMacros(protein: number | null, fat: number | null, carbs: number | null): number | null {
  let calories: number | null = null;

  if (protein !== null) calories = (calories ?? 0) + protein * 4;
  if (fat !== null) calories = (calories ?? 0) + fat * 9;
  if (carbs !== null) calories = (calories ?? 0) + carbs * 4;

  return calories;
}
