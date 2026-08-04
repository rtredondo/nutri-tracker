import { useState, useMemo } from 'react';
import type { Food } from '../lib/nutrients';
import { getCategoryColors } from '../lib/categories';

interface FoodPickerProps {
  foods: Food[];
  onSelect: (food: Food) => void;
  onClose: () => void;
  filterCategory?: string;
  excludeFoodId?: string;
  headerLabel?: string;
}

export default function FoodPicker({
  foods,
  onSelect,
  onClose,
  filterCategory,
  excludeFoodId,
  headerLabel
}: FoodPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(filterCategory || null);
  const [showAllCategories, setShowAllCategories] = useState(!filterCategory);

  const categories = useMemo(() => {
    return Array.from(new Set(foods.map((f) => f.category))).sort();
  }, [foods]);

  const filtered = useMemo(() => {
    return foods.filter((f) => {
      const matchesSearch = f.food_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || f.category === selectedCategory;
      const notExcluded = !excludeFoodId || f.food_id !== excludeFoodId;
      return matchesSearch && matchesCategory && notExcluded;
    });
  }, [foods, search, selectedCategory, excludeFoodId]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Food[]> = {};
    filtered.forEach((food) => {
      if (!grouped[food.category]) {
        grouped[food.category] = [];
      }
      grouped[food.category].push(food);
    });
    return grouped;
  }, [filtered]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {headerLabel || 'Add Food'}
          </h3>
          <input
            type="text"
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3"
          />

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {!filterCategory && (
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setShowAllCategories(true);
                }}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
            )}
            {(showAllCategories ? categories : (filterCategory ? [filterCategory] : [])).map((cat) => {
              const colors = getCategoryColors(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (filterCategory && cat === filterCategory) {
                      setShowAllCategories(true);
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory(String(cat));
                      setShowAllCategories(false);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedCategory === cat
                      ? `${colors.pill} ring-2 ring-offset-2 dark:ring-offset-gray-800`
                      : colors.pill
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {filterCategory && showAllCategories && (
              <button
                onClick={() => setShowAllCategories(false)}
                className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No foods found
            </div>
          ) : (
            <div>
              {showAllCategories && !filterCategory ? (
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
                            onClick={() => onSelect(food)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">{food.food_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {food.kcal === null ? '?' : food.kcal.toFixed(0)} kcal/{food.basis_qty}
                              {food.basis_unit}
                            </p>
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
                      onClick={() => onSelect(food)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{food.food_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {food.kcal === null ? '?' : food.kcal.toFixed(0)} kcal/{food.basis_qty}
                        {food.basis_unit}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
