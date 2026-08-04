import { useState, useEffect } from 'react';
import type { Food, LogEntry } from '../lib/nutrients';
import { sumNutrients } from '../lib/nutrients';
import { fetchLogs, saveDay } from '../lib/api';
import { getCachedDayEdits, cacheDayEdits, clearDayEdits, getSettings } from '../lib/storage';
import { getToday, addDays } from '../lib/dates';
import FoodRow from './FoodRow';
import NutrientSummary from './NutrientSummary';
import FoodPicker from './FoodPicker';

interface TodayViewProps {
  foods: Food[];
  cardapio: LogEntry[];
}

const MEAL_ORDER = ['1. Breakfast', '2. Almoço', '3. Lanche Tarde', '4. Jantar', '5. Colação'];

export default function TodayView({ foods, cardapio }: TodayViewProps) {
  const [date, setDate] = useState(getToday());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showFoodPicker, setShowFoodPicker] = useState<string | null>(null);
  const settings = getSettings();

  useEffect(() => {
    const loadDay = async () => {
      setLoading(true);
      setError(null);
      setSaved(false);

      // Check cache first
      const cached = getCachedDayEdits(date);
      if (cached) {
        setEntries(cached);
        setHasUnsaved(true);
        setLoading(false);
        return;
      }

      // Fetch from API
      const result = await fetchLogs(date, date);

      if ('ok' in result && result.ok && result.entries.length > 0) {
        setEntries(result.entries);
        setSaved(true);
      } else {
        // Use default cardapio
        setEntries(cardapio.filter((e) => e.meal)); // Ensure valid entries
      }

      setLoading(false);
    };

    loadDay();
  }, [date, cardapio]);

  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], qty: newQty };

    // Recompute nutrients
    const food = foods.find((f) => f.food_id === updated[index].food_id);
    if (food) {
      for (const nutrient of ['kcal', 'protein_g', 'fat_g', 'sat_fat_g', 'carbs_g', 'sugars_g', 'fibre_g', 'salt_g'] as const) {
        const value = food[nutrient];
        updated[index][nutrient] = value === null ? null : (value * newQty) / food.basis_qty;
      }
    }

    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setSaved(false);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setSaved(false);
  };

  const handleAddFood = (selectedFood: Food, meal: string) => {
    const newEntry: LogEntry = {
      meal,
      food_id: selectedFood.food_id,
      food_name: selectedFood.food_name,
      qty: 100,
      unit: selectedFood.basis_unit,
      kcal: selectedFood.kcal,
      protein_g: selectedFood.protein_g,
      fat_g: selectedFood.fat_g,
      sat_fat_g: selectedFood.sat_fat_g,
      carbs_g: selectedFood.carbs_g,
      sugars_g: selectedFood.sugars_g,
      fibre_g: selectedFood.fibre_g,
      salt_g: selectedFood.salt_g,
    };

    const updated = [...entries, newEntry];
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setSaved(false);
    setShowFoodPicker(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const result = await saveDay(date, entries);

    if ('ok' in result && result.ok) {
      setSaved(true);
      setHasUnsaved(false);
      clearDayEdits(date);
      setLoading(false);
    } else if (!('ok' in result) || !result.ok) {
      setError(('message' in result ? result.message : 'Unknown error'));
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Reset to default menu? This will discard unsaved changes.')) {
      const defaultEntries = cardapio.filter((e) => e.meal);
      setEntries(defaultEntries);
      clearDayEdits(date);
      setHasUnsaved(true);
      setSaved(false);
    }
  };

  const groupedByMeal = MEAL_ORDER.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  }));

  const totalKcal = sumNutrients(entries, 'kcal');
  const totalProtein = sumNutrients(entries, 'protein_g');
  const totalFat = sumNutrients(entries, 'fat_g');
  const totalCarbs = sumNutrients(entries, 'carbs_g');

  return (
    <div className="space-y-8">
      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Prev
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        />
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Next →
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Meals */}
      <div className="space-y-6">
        {groupedByMeal.map(({ meal, items }) => (
          <div key={meal} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 font-semibold text-gray-900 dark:text-white">
              {meal}
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((entry) => {
                const origIdx = entries.indexOf(entry);
                return (
                  <FoodRow
                    key={origIdx}
                    entry={entry}
                    onQuantityChange={(newQty) => handleQuantityChange(origIdx, newQty)}
                    onRemove={() => handleRemoveEntry(origIdx)}
                  />
                );
              })}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowFoodPicker(meal)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                + Add food
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6 sticky bottom-20">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Daily Target: {settings.calorieTarget.toLocaleString()} kcal
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalKcal.total === null ? '—' : totalKcal.total.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {totalKcal.total !== null && settings.calorieTarget > 0
                    ? `${((totalKcal.total / settings.calorieTarget) * 100).toFixed(0)}% of target`
                    : ''}
                </div>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((totalKcal.total ?? 0) / settings.calorieTarget) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <NutrientSummary
              label="Protein"
              value={totalProtein.total}
              coverage={totalProtein.coverage}
              unit="g"
            />
            <NutrientSummary
              label="Fat"
              value={totalFat.total}
              coverage={totalFat.coverage}
              unit="g"
            />
            <NutrientSummary
              label="Carbs"
              value={totalCarbs.total}
              coverage={totalCarbs.coverage}
              unit="g"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pb-4">
        <button
          onClick={handleResetToDefault}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Reset to default
        </button>
        <button
          onClick={handleSave}
          disabled={!hasUnsaved || loading}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            hasUnsaved && !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Saving...' : saved ? '✓ Saved' : 'Save Day'}
        </button>
      </div>

      {/* Food Picker Modal */}
      {showFoodPicker && (
        <FoodPicker
          foods={foods}
          onSelect={(food) => handleAddFood(food, showFoodPicker)}
          onClose={() => setShowFoodPicker(null)}
        />
      )}
    </div>
  );
}
