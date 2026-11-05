import { useCallback, useEffect, useReducer, useRef } from 'react'
import { parseServerMessage, type ClientMessage } from './protocol'
import { backoffDelay, finalCloseReason, initialSocketState, socketReducer } from './socketReducer'

type Options = {
  path: string
  // для игрока: первое сообщение после подключения
  hello?: ClientMessage
  enabled?: boolean
}

function socketUrl(path: string) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}

export function useGameSocket({ path, hello, enabled = true }: Options) {
  const [state, dispatch] = useReducer(socketReducer, initialSocketState)
  const socketRef = useRef<WebSocket | null>(null)
  const helloRef = useRef(hello)

  useEffect(() => {
    helloRef.current = hello
  }, [hello])

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let stopped = false
    let attempt = 0
    let retryTimer: number | undefined

    const connect = () => {
      dispatch({ type: 'connecting' })
      const ws = new WebSocket(socketUrl(path))
      socketRef.current = ws

      ws.onopen = () => {
        attempt = 0
        if (helloRef.current) ws.send(JSON.stringify(helloRef.current))
        dispatch({ type: 'open' })
      }

      ws.onmessage = (event) => {
        const msg = parseServerMessage(String(event.data))
        if (!msg) return
        if (msg.type === 'state') dispatch({ type: 'state', view: msg.data, receivedAt: Date.now() })
        else dispatch({ type: 'error', message: msg.data.message })
      }

      ws.onclose = (event) => {
        socketRef.current = null
        if (disposed) return

        dispatch({ type: 'dropped', code: event.code })
        attempt += 1
        if (finalCloseReason(event.code, attempt)) {
          stopped = true
          return
        }
        retryTimer = window.setTimeout(connect, backoffDelay(attempt))
      }
    }

    connect()

    // вкладка вернулась из фона, а соединение уже умерло - не ждём таймер
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socketRef.current && !stopped) {
        window.clearTimeout(retryTimer)
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
      document.removeEventListener('visibilitychange', onVisible)
      socketRef.current?.close(1000)
      socketRef.current = null
    }
  }, [path, enabled])

  const send = useCallback((msg: ClientMessage) => {
    const ws = socketRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }, [])

  const dismissError = useCallback(() => dispatch({ type: 'dismissError' }), [])

  return { ...state, send, dismissError }
}
