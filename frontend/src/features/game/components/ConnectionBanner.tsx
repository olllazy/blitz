import type { ConnectionStatus } from '../socketReducer'
import styles from './ConnectionBanner.module.css'

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status !== 'reconnecting') return null

  return (
    <div className={styles.banner} role="status">
      Связь потерялась, переподключаемся…
    </div>
  )
}
