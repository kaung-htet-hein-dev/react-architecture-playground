import { useEffect, useState } from 'react'
import { readStore, writeStore } from '../lib/storage'

/** String state mirrored to localStorage under `key`. */
export function useStoredState(key: string, fallback: string): [string, (v: string) => void] {
  const [value, setValue] = useState(() => readStore(key) ?? fallback)
  useEffect(() => {
    writeStore(key, value)
  }, [key, value])
  return [value, setValue]
}
