import { useState, useEffect, useCallback } from 'react';
import { fetchBaseData } from './lib/api';
import { cacheBaseData, getCachedBaseData } from './lib/storage';
import type { Food, LogEntry } from './lib/nutrients';
import TodayView from './components/TodayView';
import WeekView from './components/WeekView';
import SettingsView from './components/SettingsView';

type View = 'today' | 'week' | 'settings';

interface AppState {
  foods: Food[] | null;
  cardapio: LogEntry[] | null;
  loading: boolean;
  error: string | null;
  cacheStale: boolean;
}

export default function App() {
  const [view, setView] = useState<View>('today');
  const [appState, setAppState] = useState<AppState>({
    foods: null,
    cardapio: null,
    loading: true,
    error: null,
    cacheStale: false,
  });

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
      const errorMsg = 'message' in result ? result.message : 'Unknown error';
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

  if (appState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading food database...</p>
        </div>
      </div>
    );
  }

  if (appState.error && !appState.foods) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
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
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">nutri-tracker</h1>
          {appState.cacheStale && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900 px-3 py-1 rounded">
              Using cached data
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {view === 'today' && (
          <TodayView foods={appState.foods} cardapio={appState.cardapio} />
        )}
        {view === 'week' && (
          <WeekView />
        )}
        {view === 'settings' && (
          <SettingsView onRefresh={handleRefresh} />
        )}
      </main>

      {/* Navigation */}
      <nav className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 flex justify-center gap-4 py-4">
          <button
            onClick={() => setView('today')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              view === 'today'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              view === 'week'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('settings')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              view === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Settings
          </button>
        </div>
      </nav>
    </div>
  );
}
