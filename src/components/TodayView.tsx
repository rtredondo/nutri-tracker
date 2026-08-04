import { useState, useEffect, useRef } from 'react';
import type { Food, LogEntry } from '../lib/nutrients';
import { sumNutrients } from '../lib/nutrients';
import { fetchLogs, saveDay } from '../lib/api';
import { getCachedDayEdits, cacheDayEdits, clearDayEdits, getSettings, getMealCollapseState, saveMealCollapseState } from '../lib/storage';
import { getToday, addDays } from '../lib/dates';
import { debounce } from '../lib/debounce';
import { exportToCSV } from '../lib/export';
import FoodRow from './FoodRow';
import FoodPicker from './FoodPicker';

interface TodayViewProps {
  foods: Food[];
  cardapio: LogEntry[];
}

const MEAL_ORDER = ['1. Breakfast', '2. Almoço', '3. Lanche Tarde', '4. Jantar', '5. Colação'];

export default function TodayView({ foods, cardapio }: TodayViewProps) {
  const [date, setDate] = useState(getToday());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showFoodPicker, setShowFoodPicker] = useState<string | null>(null);
  const [collapsedMeals, setCollapsedMeals] = useState<Record<string, boolean>>(() =>
    getMealCollapseState(getToday())
  );
  const [autoSaveLoading, setAutoSaveLoading] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const settings = getSettings();
  const autoSaveRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadDay = async () => {
      setError(null);
      setCollapsedMeals(getMealCollapseState(date));

      // Check cache first
      const cached = getCachedDayEdits(date);
      if (cached) {
        setEntries(cached);
        setHasUnsaved(true);
        return;
      }

      // Fetch from API
      const result = await fetchLogs(date, date);

      if ('ok' in result && result.ok && result.entries.length > 0) {
        setEntries(result.entries);
      } else {
        // Use default cardapio
        setEntries(cardapio.filter((e) => e.meal)); // Ensure valid entries
      }

    };

    loadDay();
  }, [date, cardapio]);

  const performAutoSave = async (entriesToSave: LogEntry[], dateToSave: string) => {
    if (!hasUnsaved && autoSaveLoading === false) return;

    setAutoSaveLoading(true);
    setAutoSaveError(null);

    const result = await saveDay(dateToSave, entriesToSave);

    if ('ok' in result && result.ok) {
      clearDayEdits(dateToSave);
      setHasUnsaved(false);
      setLastSavedTime(Date.now());
      setAutoSaveLoading(false);
      setRetryCount(0);
      if (autoSaveRetryRef.current) {
        clearTimeout(autoSaveRetryRef.current);
        autoSaveRetryRef.current = null;
      }
      if (pendingSaveRef.current) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        performAutoSaveRef.current(pending.entries, pending.date);
      }
    } else {
      const errorMsg = 'message' in result && typeof result.message === 'string' ? result.message : 'Save failed';
      setAutoSaveError(errorMsg);
      setAutoSaveLoading(false);

      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        autoSaveRetryRef.current = setTimeout(() => {
          performAutoSave(entriesToSave, dateToSave);
        }, 5000);
      }
    }
  };

  const performAutoSaveRef = useRef(performAutoSave);
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave;
  }, [performAutoSave]);

  const pendingSaveRef = useRef<{ entries: LogEntry[]; date: string } | null>(null);

  const debouncedAutoSave = useRef(debounce(async (entriesToSave: LogEntry[], dateToSave: string) => {
    await performAutoSaveRef.current(entriesToSave, dateToSave);
  }, 2000)).current;

  // Save on visibility change and page unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsaved) {
        debouncedAutoSave.flush();
      }
    };

    const handlePageHide = () => {
      if (hasUnsaved) {
        navigator.sendBeacon('/api/sheet', JSON.stringify({
          action: 'saveDay',
          date,
          entries,
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [hasUnsaved, date, entries, debouncedAutoSave]);

  // Flush autosave on date change to save previous day
  const prevDateRef = useRef(date);
  useEffect(() => {
    if (prevDateRef.current !== date && hasUnsaved) {
      performAutoSaveRef.current(entries, prevDateRef.current);
    }
    prevDateRef.current = date;
  }, [date, hasUnsaved, entries]);

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
    setAutoSaveError(null);
    if (autoSaveLoading) {
      pendingSaveRef.current = { entries: updated, date };
    } else {
      debouncedAutoSave(updated, date);
    }
  };

  const handleRemoveEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setAutoSaveError(null);
    if (autoSaveLoading) {
      pendingSaveRef.current = { entries: updated, date };
    } else {
      debouncedAutoSave(updated, date);
    }
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
    setShowFoodPicker(null);
    setAutoSaveError(null);
    if (autoSaveLoading) {
      pendingSaveRef.current = { entries: updated, date };
    } else {
      debouncedAutoSave(updated, date);
    }
  };

  const handleSwapFood = (index: number, newFood: Food) => {
    const updated = [...entries];
    updated[index] = {
      ...updated[index],
      food_id: newFood.food_id,
      food_name: newFood.food_name,
      unit: newFood.basis_unit,
      kcal: newFood.kcal,
      protein_g: newFood.protein_g,
      fat_g: newFood.fat_g,
      sat_fat_g: newFood.sat_fat_g,
      carbs_g: newFood.carbs_g,
      sugars_g: newFood.sugars_g,
      fibre_g: newFood.fibre_g,
      salt_g: newFood.salt_g,
    };

    // Recompute nutrients with new food but keep quantity
    const qty = updated[index].qty;
    for (const nutrient of ['kcal', 'protein_g', 'fat_g', 'sat_fat_g', 'carbs_g', 'sugars_g', 'fibre_g', 'salt_g'] as const) {
      const value = newFood[nutrient];
      updated[index][nutrient] = value === null ? null : (value * qty) / newFood.basis_qty;
    }

    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setAutoSaveError(null);
    if (autoSaveLoading) {
      pendingSaveRef.current = { entries: updated, date };
    } else {
      debouncedAutoSave(updated, date);
    }
  };

  const handleSave = async () => {
    debouncedAutoSave.cancel();
    setAutoSaveLoading(true);
    setAutoSaveError(null);

    const result = await saveDay(date, entries);

    if ('ok' in result && result.ok) {
      setHasUnsaved(false);
      clearDayEdits(date);
      setLastSavedTime(Date.now());
      setAutoSaveLoading(false);
      setRetryCount(0);
    } else {
      const errorMsg = 'message' in result && typeof result.message === 'string' ? result.message : 'Save failed';
      setAutoSaveError(errorMsg);
      setAutoSaveLoading(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Reset to default menu? This will discard unsaved changes.')) {
      const defaultEntries = cardapio.filter((e) => e.meal);
      setEntries(defaultEntries);
      clearDayEdits(date);
      setHasUnsaved(true);
    }
  };

  const handleExport = () => {
    const filename = `nutri-${date}.csv`;
    exportToCSV(entries, filename, date);
  };

  const handleToggleMeal = (meal: string) => {
    const updated = { ...collapsedMeals, [meal]: !collapsedMeals[meal] };
    setCollapsedMeals(updated);
    saveMealCollapseState(date, updated);
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    MEAL_ORDER.forEach((meal) => {
      allCollapsed[meal] = true;
    });
    setCollapsedMeals(allCollapsed);
    saveMealCollapseState(date, allCollapsed);
  };

  const handleExpandAll = () => {
    setCollapsedMeals({});
    saveMealCollapseState(date, {});
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
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <div className="flex-1 space-y-8 px-4 py-8 pb-32 max-w-4xl mx-auto w-full">
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

      {/* Collapse/Expand Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleCollapseAll}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
        >
          Collapse all
        </button>
        <button
          onClick={handleExpandAll}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
        >
          Expand all
        </button>
      </div>

      {/* Meals */}
      <div className="space-y-6">
        {groupedByMeal.map(({ meal, items }) => {
          const isCollapsed = collapsedMeals[meal];
          const mealKcal = sumNutrients(items, 'kcal');
          const mealProtein = sumNutrients(items, 'protein_g');
          const mealFat = sumNutrients(items, 'fat_g');
          const mealCarbs = sumNutrients(items, 'carbs_g');

          return (
            <div key={meal} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                onClick={() => handleToggleMeal(meal)}
                className="w-full bg-gray-50 dark:bg-gray-800 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Chevron, Meal name, Item count */}
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <span
                      className="flex-shrink-0 transition-transform text-sm"
                      style={{
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                    <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white truncate">
                      {meal}
                    </span>
                    <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {items.length}
                    </span>
                  </div>

                  {/* Right: Per-meal totals (visible at all widths) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mealKcal.total === null ? '—' : mealKcal.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">kcal</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mealProtein.total === null ? '—' : mealProtein.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">P</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mealFat.total === null ? '—' : mealFat.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">F</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mealCarbs.total === null ? '—' : mealCarbs.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">C</div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Collapsed Content */}
              {!isCollapsed && (
                <>
                  {items.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 grid grid-cols-4 gap-2">
                      <div>kcal</div>
                      <div className="text-right">Protein</div>
                      <div className="text-right">Fat</div>
                      <div className="text-right">Carbs</div>
                    </div>
                  )}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((entry) => {
                      const origIdx = entries.indexOf(entry);
                      const food = foods.find((f) => f.food_id === entry.food_id);
                      if (!food) return null;
                      return (
                        <FoodRow
                          key={origIdx}
                          entry={entry}
                          food={food}
                          onQuantityChange={(newQty) => handleQuantityChange(origIdx, newQty)}
                          onRemove={() => handleRemoveEntry(origIdx)}
                          onSwap={(newFood) => handleSwapFood(origIdx, newFood)}
                          allFoods={foods}
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
                </>
              )}
            </div>
          );
        })}
      </div>

      </div>

      {/* Sticky Summary Footer - Compact */}
      <div className="sticky bottom-0 z-40 bg-white dark:bg-gray-900 shadow-lg">
        {/* Progress bar at top */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${Math.min(
                100,
                ((totalKcal.total ?? 0) / settings.calorieTarget) * 100
              )}%`,
            }}
          ></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-2 md:py-3">
          {/* Main summary row */}
          <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
            {/* Left: Kcal + Target */}
            <div className="flex items-baseline gap-1 md:gap-2 flex-shrink-0">
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {totalKcal.total === null ? '—' : totalKcal.total.toFixed(0)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {totalKcal.total !== null && settings.calorieTarget > 0
                  ? `${((totalKcal.total / settings.calorieTarget) * 100).toFixed(0)}%`
                  : ''}
              </div>
            </div>

            {/* Right: P/F/C compact figures */}
            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm flex-shrink-0">
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">
                  {totalProtein.total === null ? '—' : totalProtein.total.toFixed(0)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">P</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">
                  {totalFat.total === null ? '—' : totalFat.total.toFixed(0)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">F</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">
                  {totalCarbs.total === null ? '—' : totalCarbs.total.toFixed(0)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">C</div>
              </div>
            </div>
          </div>

          {/* Status + Action buttons row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            {/* Status line */}
            <div className="text-gray-600 dark:text-gray-400 flex-1 min-w-0 truncate">
              {autoSaveLoading && <span>Saving…</span>}
              {!autoSaveLoading && autoSaveError && retryCount >= 3 && (
                <button
                  onClick={handleSave}
                  className="text-red-600 dark:text-red-400 hover:underline font-medium whitespace-nowrap"
                >
                  Save failed
                </button>
              )}
              {!autoSaveLoading && autoSaveError && retryCount < 3 && (
                <span className="text-red-600 dark:text-red-400">Retrying…</span>
              )}
              {!autoSaveLoading && !autoSaveError && lastSavedTime && !hasUnsaved && (
                <span>
                  Saved {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {!autoSaveLoading && !autoSaveError && hasUnsaved && (
                <span>Unsaved</span>
              )}
            </div>

            {/* Action buttons - compact */}
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <button
                onClick={handleResetToDefault}
                className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
              >
                Reset
              </button>
              <button
                onClick={handleExport}
                className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
              >
                Export
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsaved || autoSaveLoading}
                className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded font-medium transition whitespace-nowrap ${
                  hasUnsaved && !autoSaveLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Sync
              </button>
            </div>
          </div>
        </div>
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
