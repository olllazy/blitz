import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { markSessionExpired, resetSessionExpired } from './sessionExpired'
import { REDIRECT_AFTER_SEC, SessionExpiredModal } from './SessionExpiredModal'

function renderApp() {
  const client = new QueryClient()
  client.setQueryData(['me'], { id: 1, name: 'Анна' })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/" element={<p>главная</p>} />
          <Route path="/login" element={<p>страница входа</p>} />
          <Route path="/app" element={<p>кабинет</p>} />
        </Routes>
        <SessionExpiredModal />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

describe('SessionExpiredModal', () => {
  afterEach(() => {
    vi.useRealTimers()
    act(() => resetSessionExpired())
  })

  it('пока сессия жива, окна нет', () => {
    renderApp()
    expect(screen.queryByText('Вы вышли из аккаунта')).not.toBeInTheDocument()
  })

  it('кнопка ведёт на главную и чистит данные прошлой сессии', async () => {
    const client = renderApp()
    act(() => markSessionExpired())

    expect(screen.getByText('Вы вышли из аккаунта')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Перейти на главную' }))

    expect(screen.getByText('главная')).toBeInTheDocument()
    expect(screen.queryByText('Вы вышли из аккаунта')).not.toBeInTheDocument()
    expect(client.getQueryData(['me'])).toBeNull()
  })

  it('через 10 секунд само переводит на страницу входа', () => {
    vi.useFakeTimers()
    renderApp()
    act(() => markSessionExpired())

    expect(screen.getByText(/Через 10 секунд/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/Через 9 секунд/)).toBeInTheDocument()

    for (let i = 1; i < REDIRECT_AFTER_SEC; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(screen.getByText('страница входа')).toBeInTheDocument()
    expect(screen.queryByText('Вы вышли из аккаунта')).not.toBeInTheDocument()
  })
})
