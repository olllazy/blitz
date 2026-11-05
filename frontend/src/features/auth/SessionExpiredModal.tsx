import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { pluralize } from '../../shared/format'
import { Button } from '../../shared/ui/Button'
import { meKey } from './api'
import { resetSessionExpired, useSessionExpired } from './sessionExpired'
import styles from './SessionExpiredModal.module.css'

export const REDIRECT_AFTER_SEC = 10

export function SessionExpiredModal() {
  const expired = useSessionExpired()
  return expired ? <ExpiredDialog /> : null
}

function ExpiredDialog() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const ref = useRef<HTMLDialogElement>(null)
  const [left, setLeft] = useState(REDIRECT_AFTER_SEC)

  const leave = useCallback(
    (to: string) => {
      // данные прошлой сессии больше не нужны
      qc.clear()
      qc.setQueryData(meKey, null)
      resetSessionExpired()
      navigate(to, { replace: true })
    },
    [qc, navigate],
  )

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // showModal блокирует страницу под окном; в jsdom его нет, там просто открываем
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])

  useEffect(() => {
    if (left <= 0) {
      leave('/login')
      return
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left, leave])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="session-expired-title"
      // окно нельзя закрыть клавишей Escape - только кнопкой или по таймеру
      onCancel={(e) => e.preventDefault()}
    >
      <h2 id="session-expired-title" className={styles.title}>
        Вы вышли из аккаунта
      </h2>
      <p className={styles.text}>
        Сессия закончилась: истёк срок входа или вы вышли из аккаунта в другой вкладке.
      </p>
      <p className={styles.timer}>
        Через {pluralize(left, ['секунду', 'секунды', 'секунд'])} откроется страница входа.
      </p>
      <Button size="lg" block onClick={() => leave('/')}>
        Перейти на главную
      </Button>
    </dialog>
  )
}
