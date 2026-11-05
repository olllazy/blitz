import { describe, expect, it } from 'vitest'
import { pluralize } from './format'

describe('pluralize', () => {
  const words: [string, string, string] = ['вопрос', 'вопроса', 'вопросов']

  it.each([
    [1, '1 вопрос'],
    [2, '2 вопроса'],
    [5, '5 вопросов'],
    [11, '11 вопросов'],
    [21, '21 вопрос'],
    [24, '24 вопроса'],
  ])('%i → %s', (n, expected) => {
    expect(pluralize(n, words)).toBe(expected)
  })
})
