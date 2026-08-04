export interface CategoryColors {
  bg: string;
  text: string;
  pill: string;
}

const CATEGORY_MAP: Record<string, CategoryColors> = {
  Bebida: {
    bg: 'bg-slate-100 dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-200',
    pill: 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200',
  },
  Fruit: {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-200',
    pill: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
  },
  Leaves: {
    bg: 'bg-lime-100 dark:bg-lime-900',
    text: 'text-lime-800 dark:text-lime-200',
    pill: 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
  },
  Vegetables: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    pill: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  },
  'Main Carb': {
    bg: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-800 dark:text-amber-200',
    pill: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
  },
  'Side Carb': {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    pill: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  },
  Nuts: {
    bg: 'bg-orange-100 dark:bg-orange-900',
    text: 'text-orange-800 dark:text-orange-200',
    pill: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  },
  Protein: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    pill: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  },
  'Queijo e CIA': {
    bg: 'bg-sky-100 dark:bg-sky-900',
    text: 'text-sky-800 dark:text-sky-200',
    pill: 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200',
  },
  Tempero: {
    bg: 'bg-violet-100 dark:bg-violet-900',
    text: 'text-violet-800 dark:text-violet-200',
    pill: 'bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200',
  },
  Tranqueira: {
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900',
    text: 'text-fuchsia-800 dark:text-fuchsia-200',
    pill: 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-800 dark:text-fuchsia-200',
  },
};

const FALLBACK_COLORS: CategoryColors = {
  bg: 'bg-gray-100 dark:bg-gray-900',
  text: 'text-gray-800 dark:text-gray-200',
  pill: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
};

export function getCategoryColors(category: string): CategoryColors {
  return CATEGORY_MAP[category] || FALLBACK_COLORS;
}

export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_MAP).sort();
}
