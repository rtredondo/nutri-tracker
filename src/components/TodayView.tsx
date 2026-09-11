import { useState, useEffect, useRef } from 'react';
import type { Food, LogEntry } from '../lib/nutrients';
import { sumNutrients } from '../lib/nutrients';
import { fetchLogs, saveDay } from '../lib/api';
import { getCachedDayEdits, cacheDayEdits, clearDayEdits, getSettings, getMealCollapseState, saveMealCollapseState } from '../lib/storage';
import { getToday, addDays } from '../lib/dates';
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSucessMessage, setSaveSuccessMessage] = useState(false);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settings = getSettings();

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
        // Use default cardapio. Note: cardapio is intentionally not a dependency.
        // When the food database refreshes, it must never affect entries for any date.
        setEntries(cardapio.filter((e) => e.meal)); // Ensure valid entries
      }

    };

    loadDay();
  }, [date]);

  // Save current day when navigating to another date
  const prevDateRef = useRef(date);
  useEffect(() => {
    if (prevDateRef.current !== date && hasUnsaved) {
      saveDay(prevDateRef.current, entries).then((result) => {
        if ('ok' in result && result.ok) {
          clearDayEdits(prevDateRef.current);
        }
      });
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
    setSaveError(null);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setSaveError(null);
  };

  const createLogEntry = (food: Food, meal: string): LogEntry => ({
    meal,
    food_id: food.food_id,
    food_name: food.food_name,
    qty: 100,
    unit: food.basis_unit,
    kcal: food.kcal,
    protein_g: food.protein_g,
    fat_g: food.fat_g,
    sat_fat_g: food.sat_fat_g,
    carbs_g: food.carbs_g,
    sugars_g: food.sugars_g,
    fibre_g: food.fibre_g,
    salt_g: food.salt_g,
  });

  const handleAddFood = (selectedFood: Food, meal: string) => {
    const newEntry = createLogEntry(selectedFood, meal);
    const updated = [...entries, newEntry];
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setShowFoodPicker(null);
    setSaveError(null);
  };

  const handleAddMultipleFoods = (selectedFoods: Food[], meal: string) => {
    const newEntries = selectedFoods.map((food) => createLogEntry(food, meal));
    const updated = [...entries, ...newEntries];
    setEntries(updated);
    cacheDayEdits(date, updated);
    setHasUnsaved(true);
    setShowFoodPicker(null);
    setSaveError(null);
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
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError(null);

    const result = await saveDay(date, entries);

    if ('ok' in result && result.ok) {
      setHasUnsaved(false);
      clearDayEdits(date);
      setSaveLoading(false);
      setSaveSuccessMessage(true);
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
      saveSuccessTimerRef.current = setTimeout(() => {
        setSaveSuccessMessage(false);
      }, 2000);
    } else {
      const errorMsg = 'message' in result && typeof result.message === 'string' ? result.message : 'Save failed';
      setSaveError(errorMsg);
      setSaveLoading(false);
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

  // Warn before unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved]);

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
  const totalSatFat = sumNutrients(entries, 'sat_fat_g');
  const totalFibre = sumNutrients(entries, 'fibre_g');

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 space-y-8 px-4 py-8 pb-56 max-w-4xl mx-auto w-full">
      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition font-medium"
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
          className="px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition font-medium"
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
                className="w-full bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
              >
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Left: Chevron, Meal name, Item count */}
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                    <span
                      className="flex-shrink-0 transition-transform text-xs sm:text-sm"
                      style={{
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 dark:text-white truncate">
                      {meal}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {items.length}
                    </span>
                  </div>

                  {/* Right: Per-meal totals (visible at all widths, compact on mobile) */}
                  <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {mealKcal.total === null ? '—' : mealKcal.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">kcal</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {mealProtein.total === null ? '—' : mealProtein.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">P</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {mealFat.total === null ? '—' : mealFat.total.toFixed(0)}
                      </div>
                      <div className="text-xs hidden sm:block">F</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
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

      {/* Fixed Summary Footer - Compact */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 shadow-lg pb-[env(safe-area-inset-bottom)]" style={{ transform: 'translateZ(0)' }}>
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
          {/* Nutrient metrics row - 6 equal-width cells */}
          <div className="grid grid-cols-6 gap-2 mb-3">
            {/* kcal cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">kcal</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalKcal.total === null ? '—' : totalKcal.total.toFixed(0)}
              </div>
              {totalKcal.total !== null && settings.calorieTarget > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {`${((totalKcal.total / settings.calorieTarget) * 100).toFixed(0)}%`}
                </div>
              )}
            </div>

            {/* Protein cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">P</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalProtein.total === null ? '—' : totalProtein.total.toFixed(0)}
              </div>
            </div>

            {/* Fat cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">F</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalFat.total === null ? '—' : totalFat.total.toFixed(0)}
              </div>
            </div>

            {/* Carbs cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">C</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalCarbs.total === null ? '—' : totalCarbs.total.toFixed(0)}
              </div>
            </div>

            {/* Sat. Fat cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">SF</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalSatFat.total === null ? '—' : totalSatFat.total.toFixed(1)}
              </div>
            </div>

            {/* Fibre cell */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-500">Fi</div>
              <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                {totalFibre.total === null ? '—' : totalFibre.total.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Action buttons row - Date on left, Save (primary) on left, Reset on right */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Date */}
            <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
              {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>

            {/* Right: Save and Reset buttons */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Save button - primary action, now on the LEFT */}
              <button
                onClick={handleSave}
                disabled={!hasUnsaved || saveLoading}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded font-semibold whitespace-nowrap transition flex items-center justify-center gap-2 flex-shrink-0 text-xs md:text-sm ${
                  saveError
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : saveSucessMessage
                      ? 'bg-green-600 text-white'
                      : hasUnsaved && !saveLoading
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {saveLoading && (
                  <svg className="animate-spin h-3 w-3 md:h-4 md:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>
                  {saveLoading ? 'Saving…' : saveSucessMessage ? '✓ Saved' : saveError ? 'Save failed' : (hasUnsaved ? 'Save' : 'Saved')}
                </span>
              </button>

              {/* Reset button - secondary action, on the RIGHT */}
              <button
                onClick={handleResetToDefault}
                className="px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap transition flex-shrink-0 text-xs md:text-sm"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Status message if error */}
          {saveError && !saveLoading && (
            <div className="text-red-600 dark:text-red-400 font-medium text-xs mt-1">
              Tap to retry
            </div>
          )}
        </div>
      </div>

      {/* Food Picker Modal */}
      {showFoodPicker && (
        <FoodPicker
          foods={foods}
          onSelect={(food) => handleAddFood(food, showFoodPicker)}
          onSelectMultiple={(foods) => handleAddMultipleFoods(foods, showFoodPicker)}
          onClose={() => setShowFoodPicker(null)}
        />
      )}
    </div>
  );
}
