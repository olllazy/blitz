import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../shared/api'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Field'
import { Logo } from '../../shared/ui/Logo'
import { fetchGame, joinGame, type GameInfo } from './api'
import { loadSession, saveSession } from './session'
import styles from './JoinPage.module.css'

const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, 6)

export function JoinPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [pin, setPin] = useState(() => onlyDigits(params.get('pin') ?? ''))
  const [name, setName] = useState('')
  const [game, setGame] = useState<GameInfo | null>(null)

  const check = useMutation({
    mutationFn: fetchGame,
    onSuccess: (info) => {
      // уже играли в этой вкладке - сразу возвращаем в игру
      if (loadSession(info.pin)) navigate(`/play/${info.pin}`)
      else setGame(info)
    },
  })

  const join = useMutation({
    mutationFn: ({ pin, name }: { pin: string; name: string }) => joinGame(pin, name),
    onSuccess: (res, vars) => {
      saveSession(vars.pin, { token: res.token, name: res.name, playerId: res.playerId })
      navigate(`/play/${vars.pin}`)
    },
  })

  // пришли по ссылке или qr-коду - код уже известен
  const { mutate: checkPin } = check
  const initialPin = onlyDigits(params.get('pin') ?? '')
  useEffect(() => {
    if (initialPin.length === 6) checkPin(initialPin)
  }, [initialPin, checkPin])

  const submitPin = (e: FormEvent) => {
    e.preventDefault()
    if (pin.length === 6) check.mutate(pin)
  }

  const submitName = (e: FormEvent) => {
    e.preventDefault()
    if (game && name.trim()) join.mutate({ pin: game.pin, name: name.trim() })
  }

  const canJoin = game && game.phase === 'lobby'

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Logo />
      </header>

      <main className={styles.card}>
        {!game ? (
          <form onSubmit={submitPin} className={styles.form}>
            <h1 className={styles.title}>Код игры</h1>
            <p className={styles.lead}>Шесть цифр на экране у ведущего</p>
            <Input
              className={styles.pin}
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Код игры"
              autoFocus
            />
            {check.isError ? (
              <p className={styles.error} role="alert">
                {errorMessage(check.error)}
              </p>
            ) : null}
            <Button type="submit" size="lg" block disabled={pin.length !== 6} loading={check.isPending}>
              Дальше
            </Button>
          </form>
        ) : (
          <form onSubmit={submitName} className={styles.form}>
            <p className={styles.gameTitle}>{game.title}</p>
            <h1 className={styles.title}>{canJoin ? 'Как вас записать?' : 'Игра уже идёт'}</h1>
            {canJoin ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  placeholder="Имя или прозвище"
                  aria-label="Имя"
                  autoComplete="nickname"
                  autoFocus
                />
                {join.isError ? (
                  <p className={styles.error} role="alert">
                    {errorMessage(join.error)}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  variant="sun"
                  block
                  disabled={!name.trim()}
                  loading={join.isPending}
                >
                  Поехали!
                </Button>
              </>
            ) : (
              <p className={styles.lead}>
                Подключиться можно только до старта. Попросите ведущего запустить новую.
              </p>
            )}
            <Button variant="ghost" onClick={() => setGame(null)}>
              ← Другой код
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
