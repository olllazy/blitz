import { ButtonLink } from '../shared/ui/Button'
import { Logo } from '../shared/ui/Logo'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Logo />
      <p className={styles.code}>404</p>
      <h1>Такой страницы нет</h1>
      <p>Возможно, ссылка устарела или в ней опечатка.</p>
      <ButtonLink to="/">На главную</ButtonLink>
    </div>
  )
}
