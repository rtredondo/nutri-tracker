import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { LogEntry } from '../lib/nutrients';
import { sumNutrients } from '../lib/nutrients';
import { fetchLogs } from '../lib/api';
import { getToday, addDays, getWeekDates, getDayName, getWeekBoundaries } from '../lib/dates';
import { getSettings } from '../lib/storage';

interface DayData {
  date: string;
  dayName: string;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  isToday: boolean;
}

export default function WeekView() {
  const [weekDate, setWeekDate] = useState(getToday());
  const [days, setDays] = useState<DayData[]>([]);
  const settings = getSettings();

  useEffect(() => {
    const loadWeek = async () => {
      const dates = getWeekDates(weekDate);
      const { monday, sunday } = getWeekBoundaries(weekDate);

      const result = await fetchLogs(monday, sunday);
      const logsMap = new Map<string, LogEntry[]>();

      if ('ok' in result && result.ok) {
        result.entries.forEach((entry) => {
          if (!logsMap.has(entry.meal)) {
            logsMap.set(entry.meal, []);
          }
          logsMap.get(entry.meal)!.push(entry);
        });
      }

      const today = getToday();
      const dayData: DayData[] = dates.map((date) => {
        const dayEntries = logsMap.get(date) || [];
        const kcal = sumNutrients(dayEntries, 'kcal').total;
        const protein = sumNutrients(dayEntries, 'protein_g').total;
        const fat = sumNutrients(dayEntries, 'fat_g').total;
        const carbs = sumNutrients(dayEntries, 'carbs_g').total;

        return {
          date,
          dayName: getDayName(date),
          kcal,
          protein,
          fat,
          carbs,
          isToday: date === today,
        };
      });

      setDays(dayData);
    };

    loadWeek();
  }, [weekDate]);

  const handlePrevWeek = () => {
    setWeekDate(addDays(weekDate, -7));
  };

  const handleNextWeek = () => {
    setWeekDate(addDays(weekDate, 7));
  };

  const { monday, sunday } = getWeekBoundaries(weekDate);
  const daysWithLogs = days.filter((d) => d.kcal !== null && Number.isFinite(d.kcal)).length;
  const weekAvg =
    daysWithLogs > 0
      ? days.reduce((sum, d) => sum + (d.kcal !== null && Number.isFinite(d.kcal) ? d.kcal : 0), 0) / daysWithLogs
      : 0;
  const weekTotal = days.reduce((sum, d) => {
    if (d.kcal !== null && Number.isFinite(d.kcal)) {
      return sum + d.kcal;
    }
    return sum;
  }, 0);

  const chartData = days.map((d) => ({
    date: d.date.slice(5),
    kcal: d.kcal ?? 0,
    name: d.dayName.slice(0, 3),
  }));

  return (
    <div className="space-y-8">
      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevWeek}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Prev Week
        </button>
        <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-48 text-center">
          {monday} – {sunday}
        </div>
        <button
          onClick={handleNextWeek}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Next Week →
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Week Total</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {weekTotal.toFixed(0)} kcal
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Week Avg ({daysWithLogs} {daysWithLogs === 1 ? 'day' : 'days'})
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {weekAvg.toFixed(0)} kcal
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: unknown) => {
                if (typeof value === 'number') return value.toLocaleString();
                return String(value);
              }}
              labelFormatter={(label: unknown) => `${String(label)} kcal`}
            />
            <ReferenceLine
              y={settings.calorieTarget}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'Target', position: 'insideTopRight', offset: -5 }}
            />
            <Bar dataKey="kcal" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Day
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                kcal
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                Protein
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                Fat
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                Carbs
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                vs Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {days.map((day) => {
              const variance =
                day.kcal !== null ? day.kcal - settings.calorieTarget : null;
              return (
                <tr
                  key={day.date}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                    day.isToday
                      ? 'bg-blue-50 dark:bg-blue-900'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                    {day.date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {day.dayName}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
                    {day.kcal === null ? '—' : day.kcal.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {day.protein === null ? '—' : day.protein.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {day.fat === null ? '—' : day.fat.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {day.carbs === null ? '—' : day.carbs.toFixed(1)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      variance === null
                        ? 'text-gray-500 dark:text-gray-500'
                        : variance > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance.toFixed(0)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
