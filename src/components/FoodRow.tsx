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
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-gray-900 dark:text-white truncate">{entry.food_name}</p>
              <span className={`inline-block text-xs px-2 py-1 rounded-full ${categoryColors.pill}`}>
                {food.category}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entry.qty} {entry.unit}
            </p>
          </div>
          <input
            type="number"
            step="0.1"
            min="0"
            value={entry.qty}
            onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
            inputMode="decimal"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
          />
          <button
            onClick={() => setShowSwapPicker(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Change
          </button>
          <button
            onClick={onRemove}
            className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            Remove
          </button>
        </div>
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
