import { describe, it, expect } from 'vitest';
import { computeNutrient, sumNutrients, formatNutrient, coerceNutrient } from './nutrients';
import type { Food, LogEntry } from './nutrients';

describe('nutrients', () => {
  describe('computeNutrient', () => {
    const food: Food = {
      food_id: 'F001',
      food_name: 'Test Food',
      category: 'Test',
      source: 'Test',
      basis_qty: 100,
      basis_unit: 'g',
      kcal: 100,
      protein_g: 10,
      fat_g: 5,
      sat_fat_g: null,
      carbs_g: 15,
      sugars_g: null,
      fibre_g: null,
      salt_g: 1,
    };

    it('multiplies nutrient by quantity', () => {
      expect(computeNutrient(food, 'kcal', 50)).toBe(50);
      expect(computeNutrient(food, 'protein_g', 200)).toBe(20);
    });

    it('returns null when food nutrient is null', () => {
      expect(computeNutrient(food, 'sat_fat_g', 100)).toBeNull();
      expect(computeNutrient(food, 'sugars_g', 50)).toBeNull();
    });

    it('preserves zero as zero, not null', () => {
      const zeroFood = { ...food, kcal: 0 };
      expect(computeNutrient(zeroFood, 'kcal', 100)).toBe(0);
    });

    it('coerces string numeric values', () => {
      const badFood = { ...food, kcal: '100' as any };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });

    it('coerces comma decimal strings to null', () => {
      const badFood = { ...food, kcal: '5,2' as any };
      expect(computeNutrient(badFood, 'kcal', 100)).toBeNull();
    });

    it('returns null for non-numeric strings', () => {
      const badFood = { ...food, kcal: 'abc' as any };
      expect(computeNutrient(badFood, 'kcal', 100)).toBeNull();
    });

    it('returns null for NaN', () => {
      const badFood = { ...food, kcal: NaN };
      expect(computeNutrient(badFood, 'kcal', 100)).toBeNull();
    });

    it('returns null for Infinity', () => {
      const badFood = { ...food, kcal: Infinity };
      expect(computeNutrient(badFood, 'kcal', 100)).toBeNull();
    });

    it('coerces basis_qty string "100g" to 100', () => {
      const badFood = { ...food, basis_qty: '100g' as any };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });

    it('falls back to 100 when basis_qty is non-numeric string', () => {
      const badFood = { ...food, basis_qty: 'abc' as any };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });

    it('falls back to 100 when basis_qty is 0', () => {
      const badFood = { ...food, basis_qty: 0 };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });

    it('falls back to 100 when basis_qty is null', () => {
      const badFood = { ...food, basis_qty: null as any };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });

    it('coerces basis_qty numeric string "100" to 100', () => {
      const badFood = { ...food, basis_qty: '100' as any };
      expect(computeNutrient(badFood, 'kcal', 50)).toBe(50);
    });
  });

  describe('coerceNutrient', () => {
    it('returns null for null', () => {
      expect(coerceNutrient(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(coerceNutrient(undefined)).toBeNull();
    });

    it('converts string numeric values to number', () => {
      expect(coerceNutrient('100')).toBe(100);
      expect(coerceNutrient('5.5')).toBe(5.5);
      expect(coerceNutrient('0')).toBe(0);
    });

    it('returns null for non-numeric strings', () => {
      expect(coerceNutrient('abc')).toBeNull();
      expect(coerceNutrient('5,2')).toBeNull();
      expect(coerceNutrient('  ')).toBeNull();
    });

    it('returns null for NaN', () => {
      expect(coerceNutrient(NaN)).toBeNull();
    });

    it('returns null for Infinity', () => {
      expect(coerceNutrient(Infinity)).toBeNull();
      expect(coerceNutrient(-Infinity)).toBeNull();
    });

    it('preserves valid numbers', () => {
      expect(coerceNutrient(100)).toBe(100);
      expect(coerceNutrient(0)).toBe(0);
      expect(coerceNutrient(-5)).toBe(-5);
    });
  });

  describe('sumNutrients', () => {
    it('returns null when all entries have null for that nutrient', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: null,
          fat_g: null,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: null,
          fat_g: null,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const result = sumNutrients(entries, 'fat_g');
      expect(result.total).toBeNull();
      expect(result.coverage).toBe(0);
    });

    it('sums non-null values only', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: 10,
          fat_g: null,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: 5,
          fat_g: 2,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const proteinResult = sumNutrients(entries, 'protein_g');
      expect(proteinResult.total).toBe(15);
      expect(proteinResult.coverage).toBe(100);

      const fatResult = sumNutrients(entries, 'fat_g');
      expect(fatResult.total).toBe(2);
      expect(fatResult.coverage).toBe(50);
    });

    it('calculates correct coverage percentage', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: 10,
          fat_g: 5,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: null,
          fat_g: 2,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F003',
          food_name: 'Food C',
          qty: 100,
          unit: 'g',
          kcal: 20,
          protein_g: null,
          fat_g: null,
          sat_fat_g: null,
          carbs_g: 5,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const result = sumNutrients(entries, 'protein_g');
      expect(result.total).toBe(10);
      expect(result.coverage).toBe(33);
    });

    it('handles empty entries array', () => {
      const result = sumNutrients([], 'protein_g');
      expect(result.total).toBeNull();
      expect(result.coverage).toBe(100);
    });

    it('ignores NaN values in sum', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: 10,
          fat_g: 5,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: NaN,
          fat_g: 2,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const result = sumNutrients(entries, 'protein_g');
      expect(result.total).toBe(10);
      expect(result.coverage).toBe(50);
    });

    it('ignores Infinity values in sum', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: 10,
          fat_g: 5,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: Infinity,
          fat_g: 2,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const result = sumNutrients(entries, 'protein_g');
      expect(result.total).toBe(10);
      expect(result.coverage).toBe(50);
    });

    it('handles mix of valid and invalid values', () => {
      const entries: LogEntry[] = [
        {
          meal: 'Breakfast',
          food_id: 'F001',
          food_name: 'Food A',
          qty: 100,
          unit: 'g',
          kcal: 50,
          protein_g: 10,
          fat_g: 5,
          sat_fat_g: null,
          carbs_g: 20,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F002',
          food_name: 'Food B',
          qty: 100,
          unit: 'g',
          kcal: 30,
          protein_g: NaN,
          fat_g: 2,
          sat_fat_g: null,
          carbs_g: 10,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
        {
          meal: 'Breakfast',
          food_id: 'F003',
          food_name: 'Food C',
          qty: 100,
          unit: 'g',
          kcal: 40,
          protein_g: 15,
          fat_g: Infinity,
          sat_fat_g: null,
          carbs_g: 5,
          sugars_g: null,
          fibre_g: null,
          salt_g: null,
        },
      ];

      const proteinResult = sumNutrients(entries, 'protein_g');
      expect(proteinResult.total).toBe(25);
      expect(proteinResult.coverage).toBe(67);

      const fatResult = sumNutrients(entries, 'fat_g');
      expect(fatResult.total).toBe(7);
      expect(fatResult.coverage).toBe(67);
    });
  });

  describe('formatNutrient', () => {
    it('displays null as em dash', () => {
      expect(formatNutrient(null, 'kcal', 100)).toBe('—');
    });

    it('formats value with unit and coverage indicator when coverage < 100', () => {
      expect(formatNutrient(15.6, 'protein_g', 50)).toBe('15.6 g · 50%');
      expect(formatNutrient(123.4, 'kcal', 75)).toBe('123.4 · 75%');
    });

    it('omits coverage indicator when coverage is 100%', () => {
      expect(formatNutrient(15.6, 'protein_g', 100)).toBe('15.6 g');
      expect(formatNutrient(123.4, 'kcal', 100)).toBe('123.4');
    });

    it('shows zero as zero, not empty', () => {
      expect(formatNutrient(0, 'fat_g', 100)).toBe('0.0 g');
    });
  });
});
