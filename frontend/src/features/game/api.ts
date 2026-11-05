import { api } from '../../shared/api'
import type { Phase } from './protocol'

export type GameInfo = { pin: string; title: string; phase: Phase }
export type JoinResult = { playerId: string; name: string; token: string }

export const fetchGame = (pin: string) => api<GameInfo>(`/games/${pin}`)

export const joinGame = (pin: string, name: string) => api<JoinResult>(`/games/${pin}/join`, 'POST', { name })
