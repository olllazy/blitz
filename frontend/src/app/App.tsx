import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { meKey } from '../features/auth/api'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { markSessionExpired } from '../features/auth/sessionExpired'
import { SessionExpiredModal } from '../features/auth/SessionExpiredModal'
import { HostPage } from '../features/game/HostPage'
import { JoinPage } from '../features/game/JoinPage'
import { PlayPage } from '../features/game/PlayPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { DashboardPage } from '../features/quizzes/DashboardPage'
import { QuizEditorPage } from '../features/quizzes/QuizEditorPage'
import { LandingPage } from '../pages/LandingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ApiError } from '../shared/api'
import { AppLayout } from './AppLayout'

// 401 у вошедшего пользователя - сессия закончилась; неверный пароль на странице входа сюда не попадает
function handleAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401 && queryClient.getQueryData(meKey)) {
    markSessionExpired()
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      // 4xx повторять бессмысленно
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/play/:pin" element={<PlayPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="quizzes/new" element={<QuizEditorPage />} />
            <Route path="quizzes/:id/edit" element={<QuizEditorPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>

          <Route
            path="/host/:pin"
            element={
              <RequireAuth>
                <HostPage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <SessionExpiredModal />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
