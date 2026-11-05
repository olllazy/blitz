import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api'

export type Question = {
  text: string
  timeLimit: number
  options: string[]
  correct: number
}

export type QuizSummary = {
  id: number
  title: string
  description: string
  questionCount: number
  updatedAt: string
}

export type Quiz = QuizSummary & { questions: Question[] }

export type QuizInput = Pick<Quiz, 'title' | 'description' | 'questions'>

export const quizKeys = {
  all: ['quizzes'] as const,
  one: (id: number) => ['quizzes', id] as const,
}

export function useQuizzes() {
  return useQuery({ queryKey: quizKeys.all, queryFn: () => api<QuizSummary[]>('/quizzes') })
}

export function useQuiz(id: number | undefined) {
  return useQuery({
    queryKey: quizKeys.one(id ?? 0),
    queryFn: () => api<Quiz>(`/quizzes/${id}`),
    enabled: id !== undefined,
  })
}

export function useSaveQuiz(id?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: QuizInput) =>
      id ? api<Quiz>(`/quizzes/${id}`, 'PUT', input) : api<Quiz>('/quizzes', 'POST', input),
    onSuccess: (quiz) => {
      qc.setQueryData(quizKeys.one(quiz.id), quiz)
      qc.invalidateQueries({ queryKey: quizKeys.all, exact: true })
    },
  })
}

// карточка пропадает сразу, а если сервер ответил ошибкой - возвращается обратно
export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/quizzes/${id}`, 'DELETE'),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: quizKeys.all, exact: true })
      const previous = qc.getQueryData<QuizSummary[]>(quizKeys.all)
      qc.setQueryData<QuizSummary[]>(quizKeys.all, (list) => list?.filter((q) => q.id !== id))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(quizKeys.all, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: quizKeys.all, exact: true }),
  })
}

export function useCreateGame() {
  return useMutation({
    mutationFn: (quizId: number) => api<{ pin: string }>('/games', 'POST', { quizId }),
  })
}
