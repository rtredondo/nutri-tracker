import type { Food, LogEntry } from './nutrients';

const API_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

if (!API_URL || !API_TOKEN) {
  throw new Error('Missing VITE_API_URL or VITE_API_TOKEN environment variables');
}

export interface BaseData {
  ok: boolean;
  foods: Food[];
  cardapio: LogEntry[];
}

export interface LogResponse {
  ok: boolean;
  entries: LogEntry[];
}

export interface SaveResponse {
  ok: boolean;
  date: string;
  rows: number;
}

export interface ApiError {
  message: string;
  ok: false;
}

export async function fetchBaseData(): Promise<BaseData | ApiError> {
  try {
    const url = new URL(API_URL);
    url.searchParams.append('token', API_TOKEN);
    url.searchParams.append('action', 'base');

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.ok) return { ok: false, message: data.message || 'API returned ok: false' };

    return data as BaseData;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching base data',
    };
  }
}

export async function fetchLogs(from: string, to: string): Promise<LogResponse | ApiError> {
  try {
    const url = new URL(API_URL);
    url.searchParams.append('token', API_TOKEN);
    url.searchParams.append('action', 'log');
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.ok) return { ok: false, message: data.message || 'API returned ok: false' };

    return data as LogResponse;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching logs',
    };
  }
}

export async function saveDay(date: string, entries: LogEntry[]): Promise<SaveResponse | ApiError> {
  try {
    const url = new URL(API_URL);
    url.searchParams.append('token', API_TOKEN);

    const body = JSON.stringify({
      action: 'saveDay',
      date,
      entries,
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.ok) return { ok: false, message: data.message || 'API returned ok: false' };

    return data as SaveResponse;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error saving day',
    };
  }
}
