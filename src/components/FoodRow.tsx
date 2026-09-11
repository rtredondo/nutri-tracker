import { useState, useRef, useEffect } from 'react';
import type { LogEntry, Food } from '../lib/nutrients';
import { getCategoryColors } from '../lib/categories';
import FoodPicker from './FoodPicker';

interface FoodRowProps {
  entry: LogEntry;
  food: Food;
  onQuantityChange: (newQty: number) => void;
  onRemove: () => void;
  onSwap: (newFood: Food) => void;
  allFoods: Food[];
}

export default function FoodRow({ entry, food, onQuantityChange, onRemove, onSwap, allFoods }: FoodRowProps) {
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const categoryColors = getCategoryColors(food.category);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowInfoPopover(false);
      }
    };

    if (showInfoPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showInfoPopover]);

  return (
    <>
      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        {/* Mobile: stacked layout below sm, Desktop: single line */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          {/* Line 1 (Mobile): Full food name with info icon, no truncation */}
          <div className="flex-1 min-w-0 mb-2 sm:mb-0 flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white break-words">{entry.food_name}</p>
            {/* Info icon button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowInfoPopover(!showInfoPopover)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                aria-label="Nutrient details"
                title="View all nutrients"
              >
                ⓘ
              </button>
              {/* Nutrient details popover */}
              {showInfoPopover && (
                <div
                  ref={popoverRef}
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10 min-w-max"
                >
                  <div className="px-3 py-2 text-xs space-y-1">
                    <div className="text-gray-900 dark:text-white font-semibold pb-1 border-b border-gray-200 dark:border-gray-700">
                      {entry.food_name}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      <div>Calories: {entry.kcal === null ? '—' : entry.kcal.toFixed(0)}</div>
                      <div>Protein: {entry.protein_g === null ? '—' : `${entry.protein_g.toFixed(1)}g`}</div>
                      <div>Fat: {entry.fat_g === null ? '—' : `${entry.fat_g.toFixed(1)}g`}</div>
                      <div>Saturated fat: {entry.sat_fat_g === null ? '—' : `${entry.sat_fat_g.toFixed(1)}g`}</div>
                      <div>Carbs: {entry.carbs_g === null ? '—' : `${entry.carbs_g.toFixed(1)}g`}</div>
                      <div>Sugars: {entry.sugars_g === null ? '—' : `${entry.sugars_g.toFixed(1)}g`}</div>
                      <div>Fibre: {entry.fibre_g === null ? '—' : `${entry.fibre_g.toFixed(1)}g`}</div>
                      <div>Salt: {entry.salt_g === null ? '—' : `${entry.salt_g.toFixed(1)}g`}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line 2 (Mobile): Category pill + Quantity input + Actions */}
          <div className="flex items-center gap-1.5 mb-2 sm:mb-0 sm:gap-4">
            {/* Category pill - visible at all widths */}
            <span className={`inline-block text-xs px-2 py-1 rounded-full flex-shrink-0 ${categoryColors.pill}`}>
              {food.category}
            </span>

            {/* Quantity input container */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                value={entry.qty}
                onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
                inputMode="decimal"
                className="w-16 sm:w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                aria-label="Quantity"
              />
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                {entry.unit}
              </span>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => setShowSwapPicker(true)}
              className="min-w-11 min-h-11 sm:min-w-auto sm:min-h-auto px-2 py-1 sm:px-0 sm:py-0 flex items-center justify-center sm:block rounded-full sm:rounded-none bg-gray-100 dark:bg-gray-700 sm:bg-transparent sm:dark:bg-transparent text-xl sm:text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 sm:hover:bg-transparent sm:hover:underline font-medium"
              aria-label="Change food"
              title="Change"
            >
              <span className="hidden sm:inline">Change</span>
              <span className="sm:hidden">✎</span>
            </button>
            <button
              onClick={onRemove}
              className="min-w-11 min-h-11 sm:min-w-auto sm:min-h-auto px-2 py-1 sm:px-0 sm:py-0 flex items-center justify-center sm:block rounded-full sm:rounded-none bg-gray-100 dark:bg-gray-700 sm:bg-transparent sm:dark:bg-transparent text-xl sm:text-sm text-red-600 dark:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 sm:hover:bg-transparent sm:hover:underline font-medium"
              aria-label="Remove food"
              title="Remove"
            >
              <span className="hidden sm:inline">Remove</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        </div>

        {/* Line 3 (Mobile): Compact nutrient line - 5 values only */}
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5 text-xs sm:text-sm">
          {/* kcal: prominent, with unit */}
          <span className="font-semibold text-gray-900 dark:text-white">
            {entry.kcal === null ? '—' : `${entry.kcal.toFixed(0)} kcal`}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>

          {/* Protein */}
          <span className="text-gray-500 dark:text-gray-400">P</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {entry.protein_g === null ? '—' : entry.protein_g.toFixed(1)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>

          {/* Fat */}
          <span className="text-gray-500 dark:text-gray-400">F</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {entry.fat_g === null ? '—' : entry.fat_g.toFixed(1)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>

          {/* Carbs */}
          <span className="text-gray-500 dark:text-gray-400">C</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {entry.carbs_g === null ? '—' : entry.carbs_g.toFixed(1)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>

          {/* Sat. Fat */}
          <span className="text-gray-500 dark:text-gray-400">SF</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {entry.sat_fat_g === null ? '—' : entry.sat_fat_g.toFixed(1)}
          </span>
        </div>
      </div>

      {showSwapPicker && (
        <FoodPicker
          foods={allFoods}
          filterCategory={food.category}
          excludeFoodId={food.food_id}
          headerLabel={`Swap — ${food.category}`}
          isSwapFlow={true}
          onSelect={(selectedFood) => {
            onSwap(selectedFood);
            setShowSwapPicker(false);
          }}
          onClose={() => setShowSwapPicker(false)}
        />
      )}
    </>
  );
}
