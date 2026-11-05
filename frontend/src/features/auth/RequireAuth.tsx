import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Loader } from '../../shared/ui/Loader'
import { useMe } from './api'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe()
  const location = useLocation()

  if (isPending) return <Loader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return children
}
