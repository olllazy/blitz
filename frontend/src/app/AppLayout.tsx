import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout, useMe } from '../features/auth/api'
import { Button } from '../shared/ui/Button'
import { Logo } from '../shared/ui/Logo'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { data: user } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [styles.link, isActive && styles.active].filter(Boolean).join(' ')

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo to="/app" />
        <nav className={styles.nav} aria-label="Разделы">
          <NavLink to="/app" end className={navClass}>
            Викторины
          </NavLink>
          <NavLink to="/app/history" className={navClass}>
            История игр
          </NavLink>
        </nav>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden>
            {user?.name.slice(0, 1).toUpperCase()}
          </span>
          <span className={styles.name}>{user?.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
          >
            Выйти
          </Button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
