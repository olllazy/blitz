import { describe, expect, it } from 'vitest'
import { emptyQuestion, quizSchema, type QuizFormValues } from './schema'

const valid = (): QuizFormValues => ({
  title: '  Кино  ',
  description: '',
  questions: [
    {
      text: 'Кто снял «Сталкера»?',
      timeLimit: 20,
      options: [{ text: 'Тарковский' }, { text: 'Михалков' }],
      correct: 0,
    },
  ],
})

describe('quizSchema', () => {
  it('пропускает корректную викторину и обрезает пробелы', () => {
    const res = quizSchema.safeParse(valid())
    expect(res.success).toBe(true)
    expect(res.data?.title).toBe('Кино')
  })

  it('не пропускает пустой вопрос из конструктора', () => {
    const res = quizSchema.safeParse({ ...valid(), questions: [emptyQuestion()] })
    expect(res.success).toBe(false)
    const paths = res.error!.issues.map((i) => i.path.join('.'))
    expect(paths).toContain('questions.0.text')
    expect(paths).toContain('questions.0.options.0.text')
  })

  it('правильный ответ должен указывать на существующий вариант', () => {
    const quiz = valid()
    quiz.questions[0].correct = 3
    const res = quizSchema.safeParse(quiz)
    expect(res.success).toBe(false)
    expect(res.error!.issues[0].path).toEqual(['questions', 0, 'correct'])
  })

  it('требует хотя бы один вопрос', () => {
    expect(quizSchema.safeParse({ ...valid(), questions: [] }).success).toBe(false)
  })
})
