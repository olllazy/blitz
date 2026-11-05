import type { ReactNode } from 'react'
import { Logo } from '../../shared/ui/Logo'
import styles from './AuthLayout.module.css'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Logo />
      </header>
      <main className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </main>
    </div>
  )
}
