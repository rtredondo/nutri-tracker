import { useState, useMemo } from 'react';
import type { Food } from '../lib/nutrients';
import { coerceBasisQty } from '../lib/nutrients';
import { getCategoryColors, getAllCategories } from '../lib/categories';

interface FoodPickerProps {
  foods: Food[];
  onSelect?: (food: Food) => void;
  onSelectMultiple?: (foods: Food[]) => void;
  onSelectMultipleWithQuantities?: (foods: Food[], quantities: Map<string, number>) => void;
  onClose: () => void;
  filterCategory?: string;
  excludeFoodId?: string;
  headerLabel?: string;
  isSwapFlow?: boolean;
}

export default function FoodPicker({
  foods,
  onSelect,
  onSelectMultiple,
  onSelectMultipleWithQuantities,
  onClose,
  filterCategory,
  excludeFoodId,
  headerLabel,
  isSwapFlow = false,
}: FoodPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(filterCategory || 'All');
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [selectedQuantities, setSelectedQuantities] = useState<Map<string, number>>(new Map());

  const allCategories = useMemo(() => {
    return getAllCategories();
  }, []);

  const categories = useMemo(() => {
    return filterCategory ? [filterCategory] : ['All', ...allCategories];
  }, [filterCategory, allCategories]);

  const filtered = useMemo(() => {
    return foods.filter((f) => {
      const matchesSearch = f.food_name ? f.food_name.toLowerCase().includes(search.toLowerCase()) : !search;
      const matchesCategory = selectedCategory === 'All' || (f.category ? f.category === selectedCategory : false);
      const notExcluded = !excludeFoodId || f.food_id !== excludeFoodId;
      return matchesSearch && matchesCategory && notExcluded;
    });
  }, [foods, search, selectedCategory, excludeFoodId]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Food[]> = {};
    filtered.forEach((food) => {
      const category = food.category || '(Unknown)';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(food);
    });
    return grouped;
  }, [filtered]);

  const handleFoodClick = (food: Food) => {
    if (isSwapFlow && onSelect) {
      // Single-select mode for swap flow
      onSelect(food);
    } else {
      // Multi-select mode
      const newSelected = new Set(selectedFoods);
      const newQuantities = new Map(selectedQuantities);
      if (newSelected.has(food.food_id)) {
        newSelected.delete(food.food_id);
        newQuantities.delete(food.food_id);
      } else {
        newSelected.add(food.food_id);
        newQuantities.set(food.food_id, coerceBasisQty(food));
      }
      setSelectedFoods(newSelected);
      setSelectedQuantities(newQuantities);
    }
  };

  const handleQuantityChange = (foodId: string, qty: number) => {
    const newQuantities = new Map(selectedQuantities);
    newQuantities.set(foodId, Math.max(0, qty));
    setSelectedQuantities(newQuantities);
  };

  const handleDone = () => {
    if (selectedFoods.size > 0) {
      const selectedFoodObjects = foods.filter((f) => selectedFoods.has(f.food_id));
      if (onSelectMultipleWithQuantities) {
        onSelectMultipleWithQuantities(selectedFoodObjects, selectedQuantities);
      } else if (onSelectMultiple) {
        onSelectMultiple(selectedFoodObjects);
      }
      setSelectedFoods(new Set());
      setSelectedQuantities(new Map());
      onClose();
    }
  };

  const handleBackdropClick = () => {
    setSelectedFoods(new Set());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[85dvh] flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {headerLabel || 'Add Food'}
          </h3>

          {/* Search input - no autofocus */}
          <input
            type="text"
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-4"
          />

          {/* Category pills - horizontal scrollable line */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 flex-nowrap whitespace-nowrap pb-2">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const colors = cat === 'All' ? undefined : getCategoryColors(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm flex-shrink-0 transition ${
                      isActive
                        ? cat === 'All'
                          ? 'bg-blue-600 text-white'
                          : `${colors?.pill} ring-2 ring-offset-2 dark:ring-offset-gray-800`
                        : cat === 'All'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          : colors?.pill || 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Food list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No foods found
            </div>
          ) : (
            <div>
              {selectedCategory === 'All' ? (
                // Grouped view
                Object.entries(groupedByCategory).map(([category, categoryFoods]) => {
                  const colors = getCategoryColors(category);
                  return (
                    <div key={category}>
                      <div className={`sticky top-0 px-4 py-2 text-sm font-semibold ${colors.bg} ${colors.text} border-b border-gray-200 dark:border-gray-700`}>
                        {category}
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categoryFoods.map((food) => (
                          <button
                            key={food.food_id}
                            onClick={() => handleFoodClick(food)}
                            className={`w-full text-left px-4 py-3 transition flex items-center gap-3 ${
                              selectedFoods.has(food.food_id)
                                ? 'bg-blue-50 dark:bg-blue-900'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {selectedFoods.has(food.food_id) && (
                              <div className="text-blue-600 dark:text-blue-400">✓</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white">{food.food_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {food.kcal === null ? '?' : food.kcal.toFixed(0)} kcal/{food.basis_qty}
                                {food.basis_unit}
                              </p>
                              {selectedFoods.has(food.food_id) && (
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={selectedQuantities.get(food.food_id) ?? coerceBasisQty(food)}
                                    onChange={(e) => handleQuantityChange(food.food_id, parseFloat(e.target.value) || 0)}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    inputMode="decimal"
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-base"
                                    aria-label="Quantity"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {food.basis_unit}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Flat view (when category filtered)
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((food) => (
                    <button
                      key={food.food_id}
                      onClick={() => handleFoodClick(food)}
                      className={`w-full text-left px-4 py-3 transition flex items-center gap-3 ${
                        selectedFoods.has(food.food_id)
                          ? 'bg-blue-50 dark:bg-blue-900'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {selectedFoods.has(food.food_id) && (
                        <div className="text-blue-600 dark:text-blue-400">✓</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{food.food_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {food.kcal === null ? '?' : food.kcal.toFixed(0)} kcal/{food.basis_qty}
                          {food.basis_unit}
                        </p>
                        {selectedFoods.has(food.food_id) && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={selectedQuantities.get(food.food_id) ?? coerceBasisQty(food)}
                              onChange={(e) => handleQuantityChange(food.food_id, parseFloat(e.target.value) || 0)}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              inputMode="decimal"
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-base"
                              aria-label="Quantity"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {food.basis_unit}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSwapFlow && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFoods.size > 0 ? `${selectedFoods.size} selected` : ''}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBackdropClick}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                disabled={selectedFoods.size === 0}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedFoods.size === 0
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {isSwapFlow && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
