import { useState, useEffect, useCallback } from 'react';
import { fetchBaseData } from './lib/api';
import { cacheBaseData, getCachedBaseData } from './lib/storage';
import type { Food, LogEntry } from './lib/nutrients';
import TodayView from './components/TodayView';
import SettingsModal from './components/SettingsModal';

interface AppState {
  foods: Food[] | null;
  cardapio: LogEntry[] | null;
  loading: boolean;
  error: string | null;
  cacheStale: boolean;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    foods: null,
    cardapio: null,
    loading: true,
    error: null,
    cacheStale: false,
  });
  const [showSettings, setShowSettings] = useState(false);

  const loadBaseData = useCallback(async () => {
    const cached = getCachedBaseData();
    const hasCache = !!cached;

    // Show cached data immediately if available, with loading state
    if (hasCache) {
      setAppState({
        foods: cached!.foods,
        cardapio: cached!.cardapio,
        loading: true,
        error: null,
        cacheStale: false,
      });
    } else {
      // No cache: show full-screen spinner
      setAppState((prev) => ({ ...prev, loading: true, error: null }));
    }

    // Always fetch from API in parallel
    const result = await fetchBaseData();

    if ('ok' in result && result.ok) {
      // Update with fresh data
      cacheBaseData(result.foods, result.cardapio);
      setAppState({
        foods: result.foods,
        cardapio: result.cardapio,
        loading: false,
        error: null,
        cacheStale: false,
      });
    } else if (!('ok' in result) || !result.ok) {
      const errorMsg = ('message' in result && typeof result.message === 'string' ? result.message : undefined) || 'Unknown error';
      // Fetch failed: keep showing cached data if available
      if (hasCache) {
        const cacheAge = Date.now() - cached!.timestamp;
        const ageHours = Math.round(cacheAge / (1000 * 60 * 60) * 10) / 10;
        const ageStr =
          cacheAge < 60000
            ? 'just now'
            : cacheAge < 3600000
              ? `${Math.round(cacheAge / 60000)} minutes ago`
              : `${ageHours} hours ago`;
        setAppState({
          foods: cached!.foods,
          cardapio: cached!.cardapio,
          loading: false,
          error: `Offline — showing data from ${ageStr}`,
          cacheStale: true,
        });
      } else {
        // No cache and API failed: show error
        setAppState({
          foods: null,
          cardapio: null,
          loading: false,
          error: errorMsg,
          cacheStale: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const handleRefresh = useCallback(() => {
    loadBaseData();
  }, [loadBaseData]);

  if (appState.loading && !appState.foods) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading food database...</p>
        </div>
      </div>
    );
  }

  if (appState.error && !appState.foods) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-gray-900">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{appState.error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!appState.foods || !appState.cardapio) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">nutri-tracker</h1>
            {appState.loading && appState.foods && (
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {appState.cacheStale && appState.error && (
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                {appState.error}
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {appState.foods && appState.cardapio && (
          <TodayView foods={appState.foods} cardapio={appState.cardapio} />
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onRefresh={handleRefresh} />
      )}
    </div>
  );
}
