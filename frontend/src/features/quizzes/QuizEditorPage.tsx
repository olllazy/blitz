import { useNavigate, useParams } from 'react-router'
import { errorMessage, isUnauthorized } from '../../shared/api'
import { ButtonLink } from '../../shared/ui/Button'
import { Loader } from '../../shared/ui/Loader'
import { useQuiz, useSaveQuiz, type Quiz, type QuizInput } from './api'
import { QuizForm } from './QuizForm'
import { emptyQuestion, type QuizFormOutput, type QuizFormValues } from './schema'
import styles from './QuizEditorPage.module.css'

function toFormValues(quiz?: Quiz): QuizFormValues {
  if (!quiz) return { title: '', description: '', questions: [emptyQuestion()] }
  return {
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((q) => ({ ...q, options: q.options.map((text) => ({ text })) })),
  }
}

function toInput(values: QuizFormOutput): QuizInput {
  return {
    ...values,
    questions: values.questions.map((q) => ({ ...q, options: q.options.map((o) => o.text) })),
  }
}

export function QuizEditorPage() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()

  const quiz = useQuiz(id)
  const save = useSaveQuiz(id)

  if (id !== undefined && quiz.isPending) return <Loader />
  if (quiz.isError) {
    if (isUnauthorized(quiz.error)) return null
    return (
      <div className={styles.error}>
        <h1>Не получилось открыть викторину</h1>
        <p>{errorMessage(quiz.error)}</p>
        <ButtonLink to="/app" variant="secondary">
          К списку
        </ButtonLink>
      </div>
    )
  }

  return (
    <section>
      <div className={styles.head}>
        <ButtonLink to="/app" variant="ghost" size="sm">
          ← Все викторины
        </ButtonLink>
        <h1 className={styles.title}>{id ? 'Редактирование' : 'Новая викторина'}</h1>
      </div>

      <QuizForm
        key={quiz.data?.id ?? 'new'}
        defaultValues={toFormValues(quiz.data)}
        saving={save.isPending}
        saveError={save.isError && !isUnauthorized(save.error) ? errorMessage(save.error) : undefined}
        onSubmit={(values) => save.mutate(toInput(values), { onSuccess: () => navigate('/app') })}
      />
    </section>
  )
}
