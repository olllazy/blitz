import { useEffect, useState } from 'react'

// сколько миллисекунд осталось до endsAt по часам сервера
export function useCountdown(endsAt: number | undefined, clockOffset: number) {
  const [left, setLeft] = useState(() => (endsAt ? Math.max(0, endsAt - (Date.now() + clockOffset)) : 0))

  useEffect(() => {
    if (!endsAt) return

    const tick = () => setLeft(Math.max(0, endsAt - (Date.now() + clockOffset)))
    tick()
    const id = window.setInterval(tick, 100)
    return () => window.clearInterval(id)
  }, [endsAt, clockOffset])

  return left
}
