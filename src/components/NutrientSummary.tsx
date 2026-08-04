interface NutrientSummaryProps {
  label: string;
  value: number | null;
  coverage: number;
  unit: string;
}

export default function NutrientSummary({ label, value, coverage, unit }: NutrientSummaryProps) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">
        {value === null ? '—' : `${value.toFixed(1)}${unit}`}
      </p>
      {coverage < 100 && (
        <p className="text-xs text-gray-500 dark:text-gray-500">{coverage}% data</p>
      )}
    </div>
  );
}
