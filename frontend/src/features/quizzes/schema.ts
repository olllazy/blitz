import { z } from 'zod'

export const TIME_LIMITS = [10, 15, 20, 30, 45, 60] as const
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 4

const optionSchema = z.object({
  text: z.string().trim().min(1, 'Заполните вариант').max(80, 'Не длиннее 80 символов'),
})

const questionSchema = z
  .object({
    text: z.string().trim().min(1, 'Напишите вопрос').max(200, 'Не длиннее 200 символов'),
    timeLimit: z.number().int().min(5).max(120),
    options: z.array(optionSchema).min(MIN_OPTIONS).max(MAX_OPTIONS),
    correct: z.number().int().min(0, 'Отметьте правильный ответ'),
  })
  .refine((q) => q.correct < q.options.length, {
    message: 'Отметьте правильный ответ',
    path: ['correct'],
  })

export const quizSchema = z.object({
  title: z.string().trim().min(1, 'Придумайте название').max(80, 'Не длиннее 80 символов'),
  description: z.string().trim().max(300, 'Не длиннее 300 символов'),
  questions: z.array(questionSchema).min(1, 'Добавьте хотя бы один вопрос').max(50, 'Не больше 50 вопросов'),
})

// варианты хранятся объектами - так useFieldArray может выдать им стабильные ключи
export type QuizFormValues = z.input<typeof quizSchema>
export type QuizFormOutput = z.output<typeof quizSchema>
export type QuestionFormValues = QuizFormValues['questions'][number]

export function emptyQuestion(): QuestionFormValues {
  return { text: '', timeLimit: 20, options: [{ text: '' }, { text: '' }], correct: 0 }
}
