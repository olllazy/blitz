// типы повторяют структуры из backend/internal/game/view.go

export type Phase = 'lobby' | 'question' | 'reveal' | 'finished'

export type PlayerInfo = {
  id: string
  name: string
  score: number
  online: boolean
  answered: boolean
}

export type QuestionView = {
  index: number
  total: number
  text: string
  options: string[]
  timeLimit: number
  endsAt: number
}

export type RevealView = {
  correct: number
  counts: number[]
}

export type MeView = {
  id: string
  name: string
  score: number
  place: number
  answer: number
  lastGain: number
  lastCorrect: boolean
  streak: number
}

export type GameView = {
  role: 'host' | 'player'
  phase: Phase
  pin: string
  title: string
  players: PlayerInfo[]
  question?: QuestionView
  answered: number
  reveal?: RevealView
  me?: MeView
  serverTime: number
}

export type ServerMessage = { type: 'state'; data: GameView } | { type: 'error'; data: { message: string } }

export type ClientMessage =
  | { type: 'hello'; token: string }
  | { type: 'start' }
  | { type: 'skip' }
  | { type: 'next' }
  | { type: 'answer'; option: number }

// коды закрытия из backend/internal/httpapi/ws.go
export const CloseCode = {
  Replaced: 4000,
  GameClosed: 4001,
  Forbidden: 4003,
  UnknownPlayer: 4004,
  Unauthorized: 4401,
} as const

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw)
    if (msg && (msg.type === 'state' || msg.type === 'error') && msg.data) return msg as ServerMessage
  } catch {
    // мусор от сервера просто игнорируем
  }
  return null
}
