import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, { raw: string | null; value: unknown }>()

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }
  const cached = cache.get(key)
  if (cached && cached.raw === raw) return cached.value as T
  let value: T = fallback
  if (raw) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = fallback
    }
  }
  cache.set(key, { raw, value })
  return value
}

export function getLocal<T>(key: string, fallback: T): T {
  return read(key, fallback)
}

export function setLocal<T>(key: string, value: T) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
  listeners.get(key)?.forEach((listener) => listener())
}

/** `serverValue` is what the server renders (and hydration starts from) before localStorage is read. */
export function useLocal<T>(key: string, fallback: T, serverValue: T = fallback): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key)!.add(listener)
      const onStorage = (event: StorageEvent) => event.key === key && listener()
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.get(key)!.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
    [key],
  )
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => serverValue)
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(read(key, fallback)) : next
      setLocal(key, resolved)
    },
    // fallback is treated as a constant per key
    [key],
  )
  return [value, set]
}
