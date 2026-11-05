import { useSyncExternalStore } from 'react'

// флаг «сессия закончилась»: его ставят запросы, получившие 401, и сокет ведущего
let expired = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function markSessionExpired() {
  if (expired) return
  expired = true
  emit()
}

export function resetSessionExpired() {
  expired = false
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSessionExpired() {
  return useSyncExternalStore(subscribe, () => expired)
}
