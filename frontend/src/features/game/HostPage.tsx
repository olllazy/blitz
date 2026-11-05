import { QRCodeSVG } from 'qrcode.react'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { markSessionExpired } from '../auth/sessionExpired'
import { pluralize } from '../../shared/format'
import { Button, ButtonLink } from '../../shared/ui/Button'
import { Loader } from '../../shared/ui/Loader'
import { Logo } from '../../shared/ui/Logo'
import { AnswerGrid } from './components/AnswerGrid'
import { ConnectionBanner } from './components/ConnectionBanner'
import { Leaderboard } from './components/Leaderboard'
import { Podium } from './components/Podium'
import { TimerRing } from './components/TimerRing'
import { CloseCode, type GameView } from './protocol'
import { useCountdown } from './useCountdown'
import { useGameSocket } from './useGameSocket'
import styles from './HostPage.module.css'

export function HostPage() {
  const { pin = '' } = useParams()
  const socket = useGameSocket({ path: `/ws/host/${pin}` })
  const { view, status, closeReason, closeCode, error, dismissError, send } = socket

  useEffect(() => {
    if (closeCode === CloseCode.Unauthorized) markSessionExpired()
  }, [closeCode])

  useEffect(() => {
    if (!error) return
    const t = window.setTimeout(dismissError, 3500)
    return () => window.clearTimeout(t)
  }, [error, dismissError])

  return (
    <div className={styles.stage}>
      <ConnectionBanner status={status} />

      <header className={styles.top}>
        <Logo to="/app" light />
        {view ? (
          <div className={styles.meta}>
            <span className={styles.title}>{view.title}</span>
            <span className={styles.pinSmall}>
              код <b>{view.pin}</b>
            </span>
          </div>
        ) : null}
      </header>

      <main className={styles.main}>
        {status === 'closed' ? (
          <Closed reason={closeReason ?? 'Игра не найдена'} />
        ) : !view ? (
          <Loader label="Подключаемся к игре…" />
        ) : (
          <div className={styles.screen}>
            {view.phase === 'lobby' && <Lobby view={view} onStart={() => send({ type: 'start' })} />}
            {view.phase === 'question' && (
              <Question
                key={view.question?.index}
                view={view}
                clockOffset={socket.clockOffset}
                onSkip={() => send({ type: 'skip' })}
              />
            )}
            {view.phase === 'reveal' && <Reveal view={view} onNext={() => send({ type: 'next' })} />}
            {view.phase === 'finished' && <Finished view={view} />}
          </div>
        )}
      </main>

      {error ? (
        <p className={styles.toast} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Lobby({ view, onStart }: { view: GameView; onStart: () => void }) {
  const joinUrl = `${window.location.origin}/join?pin=${view.pin}`
  const count = view.players.length

  return (
    <div className={styles.lobby}>
      <section className={styles.invite}>
        <p className={styles.label}>Заходите на {window.location.host} и вводите код</p>
        <p className={styles.pin} aria-label={`Код игры ${view.pin.split('').join(' ')}`}>
          {view.pin.slice(0, 3)}
          <span>{view.pin.slice(3)}</span>
        </p>
        <div className={styles.qr}>
          <QRCodeSVG value={joinUrl} size={148} bgColor="#fffaf0" fgColor="#1d1a2f" marginSize={1} />
          <span>или наведите камеру</span>
        </div>
      </section>

      <section className={styles.waiting}>
        <div className={styles.waitingHead}>
          <h2>{count === 0 ? 'Ждём игроков' : pluralize(count, ['игрок', 'игрока', 'игроков'])}</h2>
          <Button size="lg" variant="sun" onClick={onStart} disabled={count === 0}>
            Начать игру
          </Button>
        </div>
        <ul className={styles.chips} aria-live="polite">
          {view.players.map((p) => (
            <li
              key={p.id}
              className={[styles.chip, !p.online && styles.offline].filter(Boolean).join(' ')}
              title={p.online ? undefined : 'не в сети'}
            >
              {p.name}
            </li>
          ))}
        </ul>
        {count === 0 ? (
          <p className={styles.hint}>Как только кто-то подключится, его имя появится здесь.</p>
        ) : null}
      </section>
    </div>
  )
}

function Question({
  view,
  clockOffset,
  onSkip,
}: {
  view: GameView
  clockOffset: number
  onSkip: () => void
}) {
  const q = view.question!
  const left = useCountdown(q.endsAt, clockOffset)

  return (
    <div className={styles.question}>
      <div className={styles.qHead}>
        <span className={styles.counter}>
          {q.index + 1} / {q.total}
        </span>
        <TimerRing leftMs={left} totalSec={q.timeLimit} />
      </div>
      <h1 className={styles.qText}>{q.text}</h1>
      <AnswerGrid options={q.options} dark />
      <div className={styles.qFoot}>
        <span className={styles.answered}>
          Ответили <b>{view.answered}</b> из {view.players.length}
        </span>
        <Button variant="secondary" onClick={onSkip}>
          Показать ответ
        </Button>
      </div>
    </div>
  )
}

function Reveal({ view, onNext }: { view: GameView; onNext: () => void }) {
  const q = view.question!
  const last = q.index + 1 === q.total

  return (
    <div className={styles.reveal}>
      <div className={styles.revealMain}>
        <span className={styles.counter}>
          {q.index + 1} / {q.total}
        </span>
        <h1 className={styles.qTextSmall}>{q.text}</h1>
        <AnswerGrid options={q.options} correct={view.reveal?.correct} counts={view.reveal?.counts} dark />
      </div>
      <aside className={styles.revealSide}>
        <h2>Лидеры</h2>
        <Leaderboard players={view.players} />
        <Button size="lg" variant="sun" block onClick={onNext}>
          {last ? 'Итоги' : 'Следующий вопрос'}
        </Button>
      </aside>
    </div>
  )
}

function Finished({ view }: { view: GameView }) {
  return (
    <div className={styles.finished}>
      <h1 className={styles.finishedTitle}>Игра окончена</h1>
      <Podium players={view.players} />
      {view.players.length > 3 ? (
        <div className={styles.rest}>
          <Leaderboard players={view.players} limit={10} />
        </div>
      ) : null}
      <div className={styles.finishedActions}>
        <ButtonLink to="/app" variant="sun" size="lg">
          К викторинам
        </ButtonLink>
        <ButtonLink to="/app/history" variant="secondary" size="lg">
          История игр
        </ButtonLink>
      </div>
    </div>
  )
}

function Closed({ reason }: { reason: string }) {
  return (
    <div className={styles.closed}>
      <h1>{reason}</h1>
      <ButtonLink to="/app" variant="sun">
        К викторинам
      </ButtonLink>
    </div>
  )
}
