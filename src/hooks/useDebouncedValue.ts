import { useEffect, useState } from 'react';

// Devuelve `value` solo cuando dejó de cambiar durante `delay` ms.
// Cada cambio cancela el timer anterior en el cleanup (patrón de unmounting de Lab 11).
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
