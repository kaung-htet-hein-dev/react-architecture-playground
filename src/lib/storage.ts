/** localStorage wrappers that survive private mode and blocked storage. */
export function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStore(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: the value lives for this page view only */
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

/** Every localStorage key the app uses, in one place. */
export const STORE_KEYS = {
  version: (id: string) => `rcr-version-${id}`,
  playgroundPreset: 'rcr-playground-preset',
  playgroundStep: 'rcr-playground-step',
} as const
