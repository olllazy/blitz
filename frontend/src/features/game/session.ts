// токен игрока живёт в sessionStorage: можно обновить страницу и вернуться в игру,
// но в новой вкладке это будет уже другой участник
export type PlayerSession = { token: string; name: string; playerId: string }

const key = (pin: string) => `blitz:player:${pin}`

export function loadSession(pin: string): PlayerSession | null {
  try {
    const raw = sessionStorage.getItem(key(pin))
    return raw ? (JSON.parse(raw) as PlayerSession) : null
  } catch {
    return null
  }
}

export function saveSession(pin: string, session: PlayerSession) {
  sessionStorage.setItem(key(pin), JSON.stringify(session))
}

export function clearSession(pin: string) {
  sessionStorage.removeItem(key(pin))
}
