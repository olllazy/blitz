import { useNavigate } from 'react-router'
import { errorMessage, isUnauthorized } from '../../shared/api'
import { formatDate, pluralize } from '../../shared/format'
import { Button, ButtonLink } from '../../shared/ui/Button'
import { Loader } from '../../shared/ui/Loader'
import { useCreateGame, useDeleteQuiz, useQuizzes, type QuizSummary } from './api'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { data: quizzes, isPending, isError, error, refetch } = useQuizzes()

  return (
    <section>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Мои викторины</h1>
          <p className={styles.lead}>Выберите викторину и запустите игру - код появится на экране.</p>
        </div>
        <ButtonLink to="/app/quizzes/new">+ Новая викторина</ButtonLink>
      </div>

      {isPending ? <Loader /> : null}

      {isError && !isUnauthorized(error) ? (
        <div className={styles.empty}>
          <p>{errorMessage(error)}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Попробовать ещё раз
          </Button>
        </div>
      ) : null}

      {quizzes?.length === 0 ? (
        <div className={styles.empty}>
          <h2>Пока пусто</h2>
          <p>Соберите первую викторину: пара вопросов, четыре варианта ответа - и можно играть.</p>
          <ButtonLink to="/app/quizzes/new" variant="sun">
            Создать викторину
          </ButtonLink>
        </div>
      ) : null}

      {quizzes && quizzes.length > 0 ? (
        <ul className={styles.grid}>
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function QuizCard({ quiz }: { quiz: QuizSummary }) {
  const navigate = useNavigate()
  const createGame = useCreateGame()
  const deleteQuiz = useDeleteQuiz()

  const start = () => {
    createGame.mutate(quiz.id, { onSuccess: ({ pin }) => navigate(`/host/${pin}`) })
  }

  const remove = () => {
    if (window.confirm(`Удалить «${quiz.title}»? Это действие нельзя отменить.`)) {
      deleteQuiz.mutate(quiz.id)
    }
  }

  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.count}>
          {pluralize(quiz.questionCount, ['вопрос', 'вопроса', 'вопросов'])}
        </span>
        <span className={styles.date}>изм. {formatDate(quiz.updatedAt)}</span>
      </div>
      <h2 className={styles.cardTitle}>{quiz.title}</h2>
      {quiz.description ? <p className={styles.description}>{quiz.description}</p> : null}

      {createGame.isError && !isUnauthorized(createGame.error) ? (
        <p className={styles.error} role="alert">
          {errorMessage(createGame.error)}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button onClick={start} loading={createGame.isPending}>
          Запустить
        </Button>
        <ButtonLink to={`/app/quizzes/${quiz.id}/edit`} variant="secondary" size="sm">
          Изменить
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={remove} aria-label={`Удалить «${quiz.title}»`}>
          Удалить
        </Button>
      </div>
    </li>
  )
}
