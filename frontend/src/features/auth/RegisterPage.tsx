import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { errorMessage } from '../../shared/api'
import { Button } from '../../shared/ui/Button'
import { Field, Input } from '../../shared/ui/Field'
import { useMe, useRegister } from './api'
import { AuthLayout } from './AuthLayout'
import { registerSchema, type RegisterValues } from './schemas'
import styles from './forms.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const { data: user } = useMe()
  const signup = useRegister()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  if (user) return <Navigate to="/app" replace />

  const submit = (values: RegisterValues) => {
    signup.mutate(values, { onSuccess: () => navigate('/app', { replace: true }) })
  }

  return (
    <AuthLayout
      title="Новый аккаунт"
      subtitle={
        <>
          Уже есть аккаунт? <Link to="/login">Войдите</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Как вас зовут" error={errors.name?.message}>
          {(a11y) => <Input autoComplete="name" {...a11y} {...register('name')} />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(a11y) => <Input type="email" autoComplete="email" {...a11y} {...register('email')} />}
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов" error={errors.password?.message}>
          {(a11y) => (
            <Input type="password" autoComplete="new-password" {...a11y} {...register('password')} />
          )}
        </Field>

        {signup.isError ? (
          <p className={styles.formError} role="alert">
            {errorMessage(signup.error)}
          </p>
        ) : null}

        <Button type="submit" size="lg" block loading={signup.isPending}>
          Создать аккаунт
        </Button>
      </form>
    </AuthLayout>
  )
}
