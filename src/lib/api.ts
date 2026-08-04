import type { Food, LogEntry } from './nutrients';

const API_BASE = '/api/sheet';

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
  error?: string;
  message?: string;
  ok: false;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON response, got ${contentType || 'unknown'}`);
  }
  return response.json();
}

export async function fetchBaseData(): Promise<BaseData | ApiError> {
  try {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.append('action', 'base');

    const response = await fetch(url.toString());
    const data = await parseJsonResponse(response);

    if (!response.ok || (typeof data === 'object' && data && 'ok' in data && !data.ok)) {
      const msgFromData =
        (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : undefined) ||
        (typeof data === 'object' && data && 'error' in data && typeof data.error === 'string' ? data.error : undefined);
      return {
        ok: false,
        message: msgFromData || `API returned status ${response.status}`,
      };
    }

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
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.append('action', 'log');
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);

    const response = await fetch(url.toString());
    const data = await parseJsonResponse(response);

    if (!response.ok || (typeof data === 'object' && data && 'ok' in data && !data.ok)) {
      const msgFromData =
        (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : undefined) ||
        (typeof data === 'object' && data && 'error' in data && typeof data.error === 'string' ? data.error : undefined);
      return {
        ok: false,
        message: msgFromData || `API returned status ${response.status}`,
      };
    }

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
    const url = new URL(API_BASE, window.location.origin);

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

    const data = await parseJsonResponse(response);

    if (!response.ok || (typeof data === 'object' && data && 'ok' in data && !data.ok)) {
      const msgFromData =
        (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string' ? data.message : undefined) ||
        (typeof data === 'object' && data && 'error' in data && typeof data.error === 'string' ? data.error : undefined);
      return {
        ok: false,
        message: msgFromData || `API returned status ${response.status}`,
      };
    }

    return data as SaveResponse;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error saving day',
    };
  }
}
