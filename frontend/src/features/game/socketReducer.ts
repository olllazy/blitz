import { CloseCode, type GameView } from './protocol'

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export type SocketState = {
  status: ConnectionStatus
  view: GameView | null
  // разница между часами сервера и клиента, чтобы таймер не врал
  clockOffset: number
  attempt: number
  error: string | null
  closeReason: string | null
  closeCode: number | null
}

export type SocketAction =
  | { type: 'connecting' }
  | { type: 'open' }
  | { type: 'state'; view: GameView; receivedAt: number }
  | { type: 'error'; message: string }
  | { type: 'dismissError' }
  | { type: 'dropped'; code: number }

export const initialSocketState: SocketState = {
  status: 'connecting',
  view: null,
  clockOffset: 0,
  attempt: 0,
  error: null,
  closeReason: null,
  closeCode: null,
}

export const MAX_ATTEMPTS = 8

const finalReasons: Record<number, string> = {
  [CloseCode.Replaced]: 'Игра открыта в другой вкладке',
  [CloseCode.GameClosed]: 'Игра не найдена или уже закрыта',
  [CloseCode.Forbidden]: 'Это не ваша игра',
  [CloseCode.UnknownPlayer]: 'Мы вас не узнали - зайдите в игру заново',
  [CloseCode.Unauthorized]: 'Сессия закончилась',
}

// null - можно переподключаться
export function finalCloseReason(code: number, attempt: number): string | null {
  if (finalReasons[code]) return finalReasons[code]
  if (attempt >= MAX_ATTEMPTS) return 'Не удаётся подключиться к игре'
  return null
}

export function socketReducer(state: SocketState, action: SocketAction): SocketState {
  switch (action.type) {
    case 'connecting':
      return { ...state, status: state.view ? 'reconnecting' : 'connecting' }
    case 'open':
      return { ...state, status: 'open', attempt: 0 }
    case 'state':
      return {
        ...state,
        view: action.view,
        clockOffset: action.view.serverTime - action.receivedAt,
        // новый вопрос - старая ошибка («время вышло» и т.п.) уже неактуальна
        error: state.view?.question?.index === action.view.question?.index ? state.error : null,
      }
    case 'error':
      return { ...state, error: action.message }
    case 'dismissError':
      return { ...state, error: null }
    case 'dropped': {
      if (state.status === 'closed') return state
      const attempt = state.attempt + 1
      const reason = finalCloseReason(action.code, attempt)
      if (reason) return { ...state, status: 'closed', closeReason: reason, closeCode: action.code }
      return { ...state, status: 'reconnecting', attempt }
    }
  }
}

// 0.5с, 1с, 2с, 4с… но не больше 8 секунд, плюс немного случайности
export function backoffDelay(attempt: number, random: () => number = Math.random) {
  const base = Math.min(500 * 2 ** (attempt - 1), 8000)
  return Math.round(base * (0.8 + random() * 0.4))
}
