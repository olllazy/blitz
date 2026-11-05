export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Нет связи с сервером', 0)
  }

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Что-то пошло не так', res.status)
  }
  return data as T
}

// про закончившуюся сессию сообщает отдельное окно, страницам эту ошибку показывать не нужно
export function isUnauthorized(err: unknown) {
  return err instanceof ApiError && err.status === 401
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Что-то пошло не так'
}
