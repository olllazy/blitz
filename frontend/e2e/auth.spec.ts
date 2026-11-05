import { expect, test } from '@playwright/test'
import { register } from './helpers'

test('кабинет закрыт для гостей', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
})

test('регистрация, выход и повторный вход', async ({ page }) => {
  await register(page, 'Анна')
  await expect(page.getByRole('heading', { name: 'Пока пусто' })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Анна')).toBeVisible()

  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/app/history')
  await expect(page).toHaveURL(/\/login$/)
})

test('неверный пароль', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@blitz.dev')
  await page.getByLabel('Пароль').fill('wrong-password')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('неверный email или пароль')
  // тут тоже 401, но пользователь ещё не вошёл - окна про выход быть не должно
  await expect(page.getByText('Вы вышли из аккаунта')).toHaveCount(0)
})

test('сессия закончилась: окно не закрывается, кнопка ведёт на главную', async ({ page, context }) => {
  await register(page)
  // как будто истёк срок входа
  await context.clearCookies()
  await page.getByRole('link', { name: 'История игр' }).click()

  const dialog = page.getByRole('dialog', { name: 'Вы вышли из аккаунта' })
  await expect(dialog).toBeVisible()
  await expect(page.getByText('нужно войти в аккаунт')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Перейти на главную' }).click()
  await expect(page).toHaveURL('/')
  await expect(dialog).toHaveCount(0)
})

test('сессия закончилась: через 10 секунд открывается страница входа', async ({ page, context }) => {
  await page.clock.install()
  await register(page)
  await context.clearCookies()
  await page.getByRole('link', { name: 'История игр' }).click()
  await expect(page.getByRole('dialog', { name: 'Вы вышли из аккаунта' })).toBeVisible()

  // отсчёт идёт по секунде, поэтому мотаем часы шагами
  for (let i = 0; i < 11; i++) await page.clock.runFor(1000)
  await expect(page).toHaveURL(/\/login$/)
})
