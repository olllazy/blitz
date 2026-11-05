import type { PlayerInfo } from '../protocol'
import styles from './Podium.module.css'

// второе место слева, первое по центру, третье справа - как на настоящем пьедестале
const order = [1, 0, 2]

export function Podium({ players }: { players: PlayerInfo[] }) {
  return (
    <div className={styles.podium}>
      {order.map((place) => {
        const p = players[place]
        if (!p) return <div key={place} />
        return (
          <div key={p.id} className={styles.column} data-place={place + 1}>
            <span className={styles.name}>{p.name}</span>
            <span className={styles.score}>{p.score.toLocaleString('ru-RU')}</span>
            <div className={styles.block}>{place + 1}</div>
          </div>
        )
      })}
    </div>
  )
}
