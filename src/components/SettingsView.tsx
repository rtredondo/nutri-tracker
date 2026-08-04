import { useState } from 'react';
import { getSettings, saveSettings, cacheBaseData, getCachedBaseData } from '../lib/storage';
import { fetchBaseData } from '../lib/api';

interface SettingsViewProps {
  onRefresh: () => void;
}

export default function SettingsView({ onRefresh }: SettingsViewProps) {
  const settings = getSettings();
  const [calorieTarget, setCalorieTarget] = useState(settings.calorieTarget);
  const [proteinTargetG, setProteinTargetG] = useState(settings.proteinTargetG ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveSettings = () => {
    saveSettings({
      calorieTarget,
      proteinTargetG: proteinTargetG ? parseFloat(String(proteinTargetG)) : undefined,
    });
    setMessage({ type: 'success', text: 'Settings saved!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRefreshDatabase = async () => {
    setLoading(true);
    setMessage(null);

    const result = await fetchBaseData();

    if ('ok' in result && result.ok) {
      cacheBaseData(result.foods, result.cardapio);
      setMessage({
        type: 'success',
        text: `Database refreshed! Loaded ${result.foods.length} foods.`,
      });
      onRefresh();
    } else if (!('ok' in result) || !result.ok) {
      const errorMsg = 'message' in result ? result.message : 'Failed to refresh database';
      setMessage({
        type: 'error',
        text: errorMsg,
      });
    }

    setLoading(false);
  };

  const cached = getCachedBaseData();
  const foodsCount = cached?.foods.length ?? 0;
  const cachedTime = cached
    ? new Date(cached.timestamp).toLocaleString()
    : 'Never';

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Targets</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Daily Calorie Target
          </label>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Daily Protein Target (g) - Optional
          </label>
          <input
            type="number"
            step="0.1"
            value={proteinTargetG}
            onChange={(e) => setProteinTargetG(e.target.value)}
            placeholder="Leave blank to skip"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
        >
          Save Targets
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Database</h2>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Foods loaded:</strong> {foodsCount}
          </p>
          <p>
            <strong>Last synced:</strong> {cachedTime}
          </p>
        </div>

        <button
          onClick={handleRefreshDatabase}
          disabled={loading}
          className={`w-full py-2 rounded-lg font-medium transition ${
            loading
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Refreshing...' : 'Refresh Database'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">API Configuration</h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">API URL:</p>
            <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
              {import.meta.env.VITE_API_URL}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Token:</p>
            <p className="font-mono text-xs text-gray-900 dark:text-white">
              {(import.meta.env.VITE_API_TOKEN || '').slice(0, 8)}
              {'•'.repeat(Math.max(0, (import.meta.env.VITE_API_TOKEN || '').length - 8))}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-center text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
