export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => Promise<unknown>,
  delayMs: number
): {
  (...args: Args): void;
  cancel: () => void;
  flush: () => Promise<void>;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastPromise: Promise<unknown> | null = null;

  const debounced = (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      timeoutId = null;
      lastPromise = fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastPromise) {
      await lastPromise;
    }
  };

  return debounced;
}
