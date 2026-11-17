"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/utils/errors";

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/** Carga datos asíncronos con estados de carga/error y recarga manual. */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList, enabled = true): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const counter = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const load = useCallback(async () => {
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === counter.current) setDataState(result);
    } catch (e) {
      if (id === counter.current) setError(errorMessage(e));
    } finally {
      if (id === counter.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    if (enabled) void load();
  }, [load, enabled]);

  return { data, error, loading, reload: load, setData: (u) => setDataState(u) };
}

/** Ejecuta una acción con estado "pending" y captura de error. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(errorMessage(e));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );
  return { run, pending, error, setError };
}
