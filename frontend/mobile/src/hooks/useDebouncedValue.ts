import { useEffect, useState } from 'react';

/** The value once it has stopped changing for `delayMs`, e.g. so search calls the API after typing stops. */
export function useDebouncedValue<T>(value: T, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
