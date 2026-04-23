import { useEffect, useRef, useState } from 'react';

// Minimal EventSource-based SSE hook. Reconnects on close with Last-Event-ID.
// The callback is memoized via a ref so subscribers don't tear down on every
// render.

export function useSse<T>(url: string | null, eventName: string): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    const handler = (ev: MessageEvent) => {
      try {
        setData(JSON.parse(ev.data) as T);
      } catch {
        // ignore malformed frame
      }
    };
    es.addEventListener(eventName, handler as EventListener);
    es.onerror = () => {
      // Let EventSource retry; if the server is down we'll just hold the
      // last good value.
    };
    return () => {
      es.removeEventListener(eventName, handler as EventListener);
      es.close();
    };
  }, [url, eventName]);

  return data;
}

// Debounced setter. Used for propose_edit on the edit path so we don't
// fire on every keystroke.
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const timer = useRef<number | null>(null);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return (...args: A) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => latest.current(...args), delayMs);
  };
}
