import type { LogEntry } from './nutrients';

const CSV_BOM = '﻿';

function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  const hasSpecialChars = str.includes(',') || str.includes('"') || str.includes('\n');

  if (hasSpecialChars) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(
  entries: LogEntry[],
  filename: string,
  date?: string
): void {
  const headers = [
    'date',
    'meal',
    'food_id',
    'food_name',
    'qty',
    'unit',
    'kcal',
    'protein_g',
    'fat_g',
    'sat_fat_g',
    'carbs_g',
    'sugars_g',
    'fibre_g',
    'salt_g',
  ];

  const rows: string[] = [CSV_BOM + headers.join(',')];

  entries.forEach((entry) => {
    const row = [
      date ? escapeCSVField(date) : '',
      escapeCSVField(entry.meal),
      escapeCSVField(entry.food_id),
      escapeCSVField(entry.food_name),
      escapeCSVField(entry.qty),
      escapeCSVField(entry.unit),
      escapeCSVField(entry.kcal),
      escapeCSVField(entry.protein_g),
      escapeCSVField(entry.fat_g),
      escapeCSVField(entry.sat_fat_g),
      escapeCSVField(entry.carbs_g),
      escapeCSVField(entry.sugars_g),
      escapeCSVField(entry.fibre_g),
      escapeCSVField(entry.salt_g),
    ];
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
