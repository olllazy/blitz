import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { pluralize } from '../../shared/format'
import { Button } from '../../shared/ui/Button'
import { Field, Input, TextArea } from '../../shared/ui/Field'
import { QuestionCard } from './QuestionCard'
import { emptyQuestion, quizSchema, type QuizFormOutput, type QuizFormValues } from './schema'
import styles from './QuizForm.module.css'

type Props = {
  defaultValues: QuizFormValues
  saving: boolean
  saveError?: string
  onSubmit: (values: QuizFormOutput) => void
}

export function QuizForm({ defaultValues, saving, saveError, onSubmit }: Props) {
  const form = useForm<QuizFormValues, unknown, QuizFormOutput>({
    resolver: zodResolver(quizSchema),
    defaultValues,
  })
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitSuccessful },
  } = form
  const questions = useFieldArray({ control, name: 'questions' })

  // не даём случайно закрыть вкладку с несохранёнными вопросами
  useEffect(() => {
    if (!isDirty || isSubmitSuccessful) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty, isSubmitSuccessful])

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.meta}>
        <Field label="Название" error={errors.title?.message}>
          {(a11y) => <Input placeholder="Например, «Кино 90-х»" {...a11y} {...register('title')} />}
        </Field>
        <Field label="Описание" hint="Необязательно" error={errors.description?.message}>
          {(a11y) => (
            <TextArea rows={2} placeholder="О чём эта викторина" {...a11y} {...register('description')} />
          )}
        </Field>
      </div>

      <div className={styles.listHead}>
        <h2>Вопросы</h2>
        <span className={styles.badge}>
          {pluralize(questions.fields.length, ['вопрос', 'вопроса', 'вопросов'])}
        </span>
      </div>
      {errors.questions?.root?.message || errors.questions?.message ? (
        <p className={styles.error} role="alert">
          {errors.questions.root?.message ?? errors.questions.message}
        </p>
      ) : null}

      <ol className={styles.list}>
        {questions.fields.map((field, index) => (
          <QuestionCard
            key={field.id}
            form={form}
            index={index}
            total={questions.fields.length}
            onRemove={() => questions.remove(index)}
            onMove={(to) => questions.move(index, to)}
          />
        ))}
      </ol>

      <Button
        variant="secondary"
        block
        className={styles.add}
        onClick={() => questions.append(emptyQuestion())}
        disabled={questions.fields.length >= 50}
      >
        + Добавить вопрос
      </Button>

      <div className={styles.footer}>
        {saveError ? (
          <p className={styles.error} role="alert">
            {saveError}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={saving}>
          Сохранить
        </Button>
      </div>
    </form>
  )
}
