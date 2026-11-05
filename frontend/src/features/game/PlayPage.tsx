import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useParams } from 'react-router'
import { pluralize } from '../../shared/format'
import { ButtonLink } from '../../shared/ui/Button'
import { Loader } from '../../shared/ui/Loader'
import { Logo } from '../../shared/ui/Logo'
import { AnswerGrid } from './components/AnswerGrid'
import { ConnectionBanner } from './components/ConnectionBanner'
import { TimerRing } from './components/TimerRing'
import { CloseCode, type ClientMessage, type GameView } from './protocol'
import { clearSession, loadSession } from './session'
import { useCountdown } from './useCountdown'
import { useGameSocket } from './useGameSocket'
import styles from './PlayPage.module.css'

export function PlayPage() {
  const { pin = '' } = useParams()
  const session = useMemo(() => loadSession(pin), [pin])

  if (!session) return <Navigate to={`/join?pin=${pin}`} replace />
  return <Play pin={pin} token={session.token} />
}

function Play({ pin, token }: { pin: string; token: string }) {
  const hello = useMemo<ClientMessage>(() => ({ type: 'hello', token }), [token])
  const socket = useGameSocket({ path: `/ws/play/${pin}`, hello })
  const { view, status, closeReason, closeCode, error, send } = socket

  // сервер перезапустили или игра удалена - старый токен больше не нужен
  useEffect(() => {
    if (closeCode === CloseCode.UnknownPlayer) clearSession(pin)
  }, [closeCode, pin])

  const me = view?.me
  // на показе ответа весь экран окрашивается в цвет результата
  const result = view?.phase === 'reveal' && me ? (me.lastCorrect ? 'good' : 'bad') : undefined

  return (
    <div className={styles.page} data-phase={view?.phase} data-result={result}>
      <ConnectionBanner status={status} />

      <header className={styles.top}>
        <Logo to="/" />
        {me ? (
          <div className={styles.me}>
            <span className={styles.name}>{me.name}</span>
            <span className={styles.score}>{me.score.toLocaleString('ru-RU')}</span>
          </div>
        ) : null}
      </header>

      <main className={styles.main}>
        {status === 'closed' ? (
          <Message title={closeReason ?? 'Игра закончилась'}>
            <ButtonLink to="/join" variant="sun">
              Войти в другую игру
            </ButtonLink>
          </Message>
        ) : !view || !me ? (
          <Loader label="Подключаемся…" />
        ) : (
          <>
            {view.phase === 'lobby' && <Lobby view={view} />}
            {view.phase === 'question' && (
              // key: на новом вопросе компонент создаётся заново и сбрасывает выбранный ответ
              <Question
                key={view.question?.index}
                view={view}
                clockOffset={socket.clockOffset}
                error={error}
                onAnswer={(option) => send({ type: 'answer', option })}
              />
            )}
            {view.phase === 'reveal' && <Reveal view={view} />}
            {view.phase === 'finished' && <Finished view={view} />}
          </>
        )}
      </main>
    </div>
  )
}

function Lobby({ view }: { view: GameView }) {
  return (
    <Message title="Вы в игре!">
      <p className={styles.lead}>Смотрите на экран ведущего - скоро начнём.</p>
      <p className={styles.muted}>
        Уже подключились: {pluralize(view.players.length, ['игрок', 'игрока', 'игроков'])}
      </p>
    </Message>
  )
}

type QuestionProps = {
  view: GameView
  clockOffset: number
  error: string | null
  onAnswer: (option: number) => boolean
}

function Question({ view, clockOffset, error, onAnswer }: QuestionProps) {
  const q = view.question!
  const me = view.me!
  const left = useCountdown(q.endsAt, clockOffset)
  // выбор подсвечивается сразу, не дожидаясь ответа сервера; при ошибке подсветка снимается
  const [pending, setPending] = useState<number | null>(null)

  const picked = me.answer >= 0 ? me.answer : pending !== null && !error ? pending : -1
  const locked = picked >= 0 || left === 0

  const pick = (option: number) => {
    if (locked) return
    if (onAnswer(option)) setPending(option)
  }

  return (
    <div className={styles.question}>
      <div className={styles.qHead}>
        <span className={styles.counter}>
          {q.index + 1} / {q.total}
        </span>
        <TimerRing leftMs={left} totalSec={q.timeLimit} />
      </div>
      <h1 className={styles.qText}>{q.text}</h1>
      <AnswerGrid options={q.options} picked={picked} onPick={pick} disabled={locked} />
      <p className={styles.status} aria-live="polite">
        {error && picked < 0
          ? error
          : picked >= 0
            ? 'Ответ принят - ждём остальных'
            : left === 0
              ? 'Время вышло'
              : ' '}
      </p>
    </div>
  )
}

function Reveal({ view }: { view: GameView }) {
  const me = view.me!
  const q = view.question!
  const correctText = view.reveal ? q.options[view.reveal.correct] : ''
  const missed = me.answer < 0

  return (
    <div className={styles.result}>
      <div className={styles.badge}>{me.lastCorrect ? '✓' : '✕'}</div>
      <h1 className={styles.resultTitle}>{me.lastCorrect ? 'Верно!' : missed ? 'Не успели' : 'Мимо'}</h1>
      {me.lastCorrect ? (
        <p className={styles.gain}>+{me.lastGain.toLocaleString('ru-RU')}</p>
      ) : (
        <p className={styles.lead}>
          Правильный ответ: <b>{correctText}</b>
        </p>
      )}
      {me.streak > 1 ? <p className={styles.streak}>серия ×{me.streak}</p> : null}
      <p className={styles.place}>
        Вы на <b>{me.place}</b> месте из {view.players.length}
      </p>
    </div>
  )
}

function Finished({ view }: { view: GameView }) {
  const me = view.me!

  return (
    <Message title={me.place === 1 ? 'Победа!' : 'Игра окончена'}>
      <div className={styles.finalPlace} data-place={Math.min(me.place, 4)}>
        <b>{me.place}</b>
        <span>место</span>
      </div>
      <p className={styles.lead}>{me.score.toLocaleString('ru-RU')} очков</p>
      <ButtonLink to="/join" variant="sun">
        Сыграть ещё
      </ButtonLink>
    </Message>
  )
}

function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.message}>
      <h1 className={styles.messageTitle}>{title}</h1>
      {children}
    </div>
  )
}
