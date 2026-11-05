import { z } from 'zod'

const email = z.string().trim().pipe(z.email('Похоже, в email опечатка'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль'),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Хотя бы 2 символа').max(40, 'Не длиннее 40 символов'),
  email,
  password: z.string().min(8, 'Минимум 8 символов').max(72, 'Не длиннее 72 символов'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
