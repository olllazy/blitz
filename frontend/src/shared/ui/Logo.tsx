import { Link } from 'react-router'
import styles from './Logo.module.css'

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link
      to={to}
      className={[styles.logo, light && styles.light].filter(Boolean).join(' ')}
      aria-label="Блиц, на главную"
    >
      <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill="var(--tomato)"
          stroke="var(--ink)"
          strokeWidth="5"
        />
        <path
          d="M36 12 20 36h11l-4 16 17-25H33z"
          fill="var(--sun)"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.word}>блиц</span>
    </Link>
  )
}
