import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage } from '../../shared/api'
import { Button } from '../../shared/ui/Button'
import { Field, Input } from '../../shared/ui/Field'
import { useLogin, useMe } from './api'
import { AuthLayout } from './AuthLayout'
import { loginSchema, type LoginValues } from './schemas'
import styles from './forms.module.css'

const demo = { email: 'demo@blitz.dev', password: 'demo1234' }

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const { data: user } = useMe()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to={from} replace />

  const submit = (values: LoginValues) => {
    login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <AuthLayout
      title="С возвращением"
      subtitle={
        <>
          Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Email" error={errors.email?.message}>
          {(a11y) => <Input type="email" autoComplete="email" {...a11y} {...register('email')} />}
        </Field>
        <Field label="Пароль" error={errors.password?.message}>
          {(a11y) => (
            <Input type="password" autoComplete="current-password" {...a11y} {...register('password')} />
          )}
        </Field>

        {login.isError ? (
          <p className={styles.formError} role="alert">
            {errorMessage(login.error)}
          </p>
        ) : null}

        <Button type="submit" size="lg" block loading={login.isPending}>
          Войти
        </Button>
      </form>

      <div className={styles.demo}>
        <span>Просто посмотреть?</span>
        <Button variant="sun" size="sm" onClick={() => submit(demo)} disabled={login.isPending}>
          Войти в демо-аккаунт
        </Button>
      </div>
    </AuthLayout>
  )
}
