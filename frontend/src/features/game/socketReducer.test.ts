import { describe, expect, it } from 'vitest'
import { CloseCode, type GameView } from './protocol'
import {
  backoffDelay,
  initialSocketState,
  MAX_ATTEMPTS,
  socketReducer,
  type SocketState,
} from './socketReducer'

const view = (patch: Partial<GameView> = {}): GameView => ({
  role: 'player',
  phase: 'lobby',
  pin: '123456',
  title: 'Тест',
  players: [],
  answered: 0,
  serverTime: 10_000,
  ...patch,
})

const question = (index: number) => ({
  index,
  total: 3,
  text: '?',
  options: ['a', 'b'],
  timeLimit: 20,
  endsAt: 0,
})

describe('socketReducer', () => {
  it('первое подключение - connecting, после потери связи - reconnecting', () => {
    let s = socketReducer(initialSocketState, { type: 'connecting' })
    expect(s.status).toBe('connecting')

    s = socketReducer(s, { type: 'state', view: view(), receivedAt: 9_000 })
    s = socketReducer(s, { type: 'dropped', code: 1006 })
    expect(s.status).toBe('reconnecting')
    expect(s.attempt).toBe(1)

    s = socketReducer(s, { type: 'connecting' })
    expect(s.status).toBe('reconnecting')

    s = socketReducer(s, { type: 'open' })
    expect(s.status).toBe('open')
    expect(s.attempt).toBe(0)
  })

  it('считает расхождение часов с сервером', () => {
    const s = socketReducer(initialSocketState, {
      type: 'state',
      view: view({ serverTime: 10_500 }),
      receivedAt: 10_000,
    })
    expect(s.clockOffset).toBe(500)
  })

  it('закрывается окончательно на служебных кодах', () => {
    const s = socketReducer(initialSocketState, { type: 'dropped', code: CloseCode.Replaced })
    expect(s.status).toBe('closed')
    expect(s.closeCode).toBe(CloseCode.Replaced)
    expect(s.closeReason).toMatch(/другой вкладке/)

    expect(socketReducer(s, { type: 'dropped', code: 1006 })).toBe(s)
  })

  it('сдаётся после MAX_ATTEMPTS неудачных попыток', () => {
    let s: SocketState = initialSocketState
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = socketReducer(s, { type: 'dropped', code: 1006 })
    expect(s.status).toBe('closed')
  })

  it('сбрасывает ошибку, когда начался следующий вопрос', () => {
    let s = socketReducer(initialSocketState, {
      type: 'state',
      view: view({ phase: 'question', question: question(0) }),
      receivedAt: 0,
    })
    s = socketReducer(s, { type: 'error', message: 'время вышло' })

    const same = socketReducer(s, {
      type: 'state',
      view: view({ phase: 'question', question: question(0) }),
      receivedAt: 0,
    })
    expect(same.error).toBe('время вышло')

    const next = socketReducer(s, {
      type: 'state',
      view: view({ phase: 'question', question: question(1) }),
      receivedAt: 0,
    })
    expect(next.error).toBeNull()
  })
})

describe('backoffDelay', () => {
  it('растёт экспоненциально и упирается в потолок', () => {
    const noJitter = () => 0.5
    expect(backoffDelay(1, noJitter)).toBe(500)
    expect(backoffDelay(2, noJitter)).toBe(1000)
    expect(backoffDelay(4, noJitter)).toBe(4000)
    expect(backoffDelay(10, noJitter)).toBe(8000)
  })

  it('добавляет разброс ±20%', () => {
    expect(backoffDelay(1, () => 0)).toBe(400)
    expect(backoffDelay(1, () => 1)).toBe(600)
  })
})
