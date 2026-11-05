import { useQuery } from '@tanstack/react-query'
import { api, errorMessage, isUnauthorized } from '../../shared/api'
import { formatDate, pluralize } from '../../shared/format'
import { ButtonLink } from '../../shared/ui/Button'
import { Loader } from '../../shared/ui/Loader'
import styles from './HistoryPage.module.css'

type PlayerResult = { name: string; score: number; correct: number; place: number }

type GameSummary = {
  id: number
  quizTitle: string
  pin: string
  startedAt: string
  finishedAt: string
  players: PlayerResult[]
}

function duration(from: string, to: string) {
  const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
  return pluralize(minutes, ['минута', 'минуты', 'минут'])
}

export function HistoryPage() {
  const {
    data: games,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['history'],
    queryFn: () => api<GameSummary[]>('/games/history'),
  })

  return (
    <section>
      <h1 className={styles.title}>История игр</h1>
      <p className={styles.lead}>Последние 30 игр, которые вы провели.</p>

      {isPending ? <Loader /> : null}
      {isError && !isUnauthorized(error) ? <p role="alert">{errorMessage(error)}</p> : null}

      {games?.length === 0 ? (
        <div className={styles.empty}>
          <p>Здесь появятся результаты, когда вы проведёте первую игру.</p>
          <ButtonLink to="/app" variant="sun">
            Выбрать викторину
          </ButtonLink>
        </div>
      ) : null}

      <div className={styles.list}>
        {games?.map((g) => (
          <details key={g.id} className={styles.game}>
            <summary className={styles.summary}>
              <div className={styles.info}>
                <h2>{g.quizTitle}</h2>
                <p>
                  {formatDate(g.finishedAt)} · {duration(g.startedAt, g.finishedAt)} ·{' '}
                  {pluralize(g.players.length, ['игрок', 'игрока', 'игроков'])}
                </p>
              </div>
              {g.players[0] ? (
                <span className={styles.winner}>
                  <span aria-hidden>★</span> {g.players[0].name}
                </span>
              ) : null}
            </summary>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Игрок</th>
                  <th scope="col">Верных</th>
                  <th scope="col">Очки</th>
                </tr>
              </thead>
              <tbody>
                {g.players.map((p) => (
                  <tr key={p.place}>
                    <td>{p.place}</td>
                    <td>{p.name}</td>
                    <td>{p.correct}</td>
                    <td>{p.score.toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </section>
  )
}
