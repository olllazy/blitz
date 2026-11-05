import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMe } from '../features/auth/api'
import { Button, ButtonLink } from '../shared/ui/Button'
import { Input } from '../shared/ui/Field'
import { Logo } from '../shared/ui/Logo'
import styles from './LandingPage.module.css'

const steps = [
  { title: 'Соберите вопросы', text: 'От двух до четырёх вариантов, свой таймер на каждый вопрос.' },
  { title: 'Покажите код', text: 'Игроки заходят с телефонов по шестизначному коду или QR.' },
  { title: 'Играйте вживую', text: 'Ответы, очки и таблица лидеров обновляются в реальном времени.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { data: user } = useMe()
  const [pin, setPin] = useState('')

  const join = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/join?pin=${pin}`)
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Logo />
        {user ? (
          <ButtonLink to="/app" variant="secondary" size="sm">
            Мои викторины
          </ButtonLink>
        ) : (
          <ButtonLink to="/login" variant="secondary" size="sm">
            Войти
          </ButtonLink>
        )}
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <h1 className={styles.title}>Кто ответит быстрее?</h1>
            <p className={styles.lead}>
              Блиц - сервис для живых квизов на работе, в классе или дома. Ведущий показывает вопросы на
              большом экране, а игроки отвечают со своих телефонов.
            </p>
            <div className={styles.cta}>
              <ButtonLink to={user ? '/app' : '/register'} size="lg">
                Создать викторину
              </ButtonLink>
              {!user ? (
                <ButtonLink to="/login" variant="ghost" size="lg">
                  Демо-вход
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <form className={styles.join} onSubmit={join}>
            <label htmlFor="landing-pin" className={styles.joinLabel}>
              Есть код игры?
            </label>
            <Input
              id="landing-pin"
              className={styles.pin}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
            />
            <Button type="submit" variant="sun" size="lg" block disabled={pin.length !== 6}>
              Войти в игру
            </Button>
          </form>
        </section>

        <section className={styles.steps}>
          {steps.map((s, i) => (
            <article key={s.title} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Блиц - пет-проект на React, TypeScript и Go</span>
      </footer>
    </div>
  )
}
