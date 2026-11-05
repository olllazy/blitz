import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnswerGrid } from './AnswerGrid'

const options = ['Париж', 'Лион', 'Ницца']

describe('AnswerGrid', () => {
  it('сообщает, какой вариант выбран', async () => {
    const onPick = vi.fn()
    render(<AnswerGrid options={options} onPick={onPick} />)

    await userEvent.click(screen.getByRole('button', { name: /Лион/ }))
    expect(onPick).toHaveBeenCalledWith(1)
  })

  it('после выбора кнопки заблокированы', () => {
    render(<AnswerGrid options={options} onPick={() => {}} picked={0} disabled />)

    expect(screen.getByRole('button', { name: /Париж/ })).toHaveAttribute('aria-pressed', 'true')
    for (const btn of screen.getAllByRole('button')) expect(btn).toBeDisabled()
  })

  it('показывает правильный ответ и статистику', () => {
    render(<AnswerGrid options={options} correct={0} counts={[3, 1, 0]} />)

    expect(screen.getByRole('button', { name: /Париж, правильный ответ/ })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
