import { useCallback, useEffect, useRef, useState } from 'react';
import { parseError } from '../services/api.js';

/**
 * Runs an async loader whenever `deps` change. Ignores stale responses.
 * Returns { data, error, loading, reload, setData }.
 */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef
      .current()
      .then((data) => id === seq.current && setState({ data, error: null, loading: false }))
      .catch((err) => id === seq.current && setState((s) => ({ data: s.data, error: parseError(err), loading: false })));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
