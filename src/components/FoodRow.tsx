import { useState } from 'react';
import type { LogEntry, Food } from '../lib/nutrients';
import { PRIMARY_NUTRIENTS } from '../lib/nutrients';
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
  const categoryColors = getCategoryColors(food.category);

  return (
    <>
      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        {/* Mobile: stacked layout below sm, Desktop: single line */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          {/* Line 1 (Mobile): Full food name, no truncation */}
          <div className="flex-1 min-w-0 mb-2 sm:mb-0">
            <p className="font-medium text-gray-900 dark:text-white break-words">{entry.food_name}</p>
          </div>

          {/* Line 2 (Mobile): Category pill + Quantity input + Actions */}
          <div className="flex items-center gap-2 mb-2 sm:mb-0 sm:gap-4">
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
              className="min-w-11 min-h-11 sm:min-w-auto sm:min-h-auto px-2 py-1 sm:px-0 sm:py-0 flex items-center justify-center sm:block text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              aria-label="Change food"
              title="Change"
            >
              <span className="hidden sm:inline">Change</span>
              <span className="sm:hidden">✎</span>
            </button>
            <button
              onClick={onRemove}
              className="min-w-11 min-h-11 sm:min-w-auto sm:min-h-auto px-2 py-1 sm:px-0 sm:py-0 flex items-center justify-center sm:block text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
              aria-label="Remove food"
              title="Remove"
            >
              <span className="hidden sm:inline">Remove</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        </div>

        {/* Line 3 (Mobile): Nutrients grid */}
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
          {PRIMARY_NUTRIENTS.map((nutrient) => (
            <div key={nutrient}>
              {nutrient === 'kcal' ? entry.kcal === null ? '—' : entry.kcal.toFixed(0) : entry[nutrient] === null ? '—' : entry[nutrient].toFixed(1)}{' '}
              {nutrient === 'kcal' ? '' : 'g'}
            </div>
          ))}
        </div>
      </div>

      {showSwapPicker && (
        <FoodPicker
          foods={allFoods}
          filterCategory={food.category}
          excludeFoodId={food.food_id}
          headerLabel={`Swap — ${food.category}`}
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
