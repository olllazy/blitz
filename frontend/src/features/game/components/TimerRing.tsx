import styles from './TimerRing.module.css'

const R = 42
const LENGTH = 2 * Math.PI * R

export function TimerRing({ leftMs, totalSec }: { leftMs: number; totalSec: number }) {
  const progress = totalSec > 0 ? Math.min(1, leftMs / (totalSec * 1000)) : 0
  const seconds = Math.ceil(leftMs / 1000)
  const hurry = seconds <= 5 && leftMs > 0

  return (
    <div
      className={[styles.ring, hurry && styles.hurry].filter(Boolean).join(' ')}
      role="timer"
      aria-live="off"
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className={styles.track} cx="50" cy="50" r={R} />
        <circle
          className={styles.bar}
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH * (1 - progress)}
        />
      </svg>
      <span className={styles.value}>
        {seconds}
        <span className="visually-hidden"> сек</span>
      </span>
    </div>
  )
}
