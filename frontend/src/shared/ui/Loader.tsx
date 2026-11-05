import styles from './Loader.module.css'

export function Loader({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <p className={styles.wrap} role="status">
      {label}
    </p>
  )
}
