import type { PlayerInfo } from '../protocol'
import styles from './Leaderboard.module.css'

type Props = {
  players: PlayerInfo[]
  limit?: number
  highlightId?: string
}

export function Leaderboard({ players, limit = 5, highlightId }: Props) {
  const top = players.slice(0, limit)

  return (
    <ol className={styles.list} aria-label="Таблица лидеров">
      {top.map((p, i) => (
        <li key={p.id} className={[styles.row, p.id === highlightId && styles.me].filter(Boolean).join(' ')}>
          <span className={styles.place}>{i + 1}</span>
          <span className={styles.name}>{p.name}</span>
          <span className={styles.score}>{p.score.toLocaleString('ru-RU')}</span>
        </li>
      ))}
    </ol>
  )
}
