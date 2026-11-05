import { devices, expect, type Browser, type Page } from '@playwright/test'

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@blitz.dev`

export async function register(page: Page, name = 'Ведущая') {
  await page.goto('/register')
  await page.getByLabel('Как вас зовут').fill(name)
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page).toHaveURL(/\/app$/)
}

export async function loginDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Войти в демо-аккаунт' }).click()
  await expect(page).toHaveURL(/\/app$/)
}

type QuestionDraft = { text: string; options: string[]; correct: number }

export async function createQuiz(page: Page, title: string, questions: QuestionDraft[]) {
  await page.goto('/app/quizzes/new')
  await page.getByLabel('Название').fill(title)

  for (const [qi, q] of questions.entries()) {
    if (qi > 0) await page.getByRole('button', { name: '+ Добавить вопрос' }).click()
    const card = page.locator('form ol > li').nth(qi)

    await card.getByRole('textbox', { name: 'Вопрос', exact: true }).fill(q.text)
    for (let oi = 0; oi < q.options.length; oi++) {
      if (oi >= 2) await card.getByRole('button', { name: '+ вариант' }).click()
      await card.getByRole('textbox', { name: new RegExp(`^Вариант ${oi + 1}`) }).fill(q.options[oi])
    }
    await card.getByLabel(`Вариант ${q.correct + 1} правильный`).check()
  }

  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page).toHaveURL(/\/app$/)
}

export async function startGame(page: Page, title: string) {
  await page
    .getByRole('listitem')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Запустить' })
    .click()
  await expect(page).toHaveURL(/\/host\/\d{6}$/)
  return page.url().split('/').pop()!
}

export async function joinAsPlayer(browser: Browser, pin: string, name: string) {
  const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'ru-RU' })
  const page = await context.newPage()
  await page.goto(`/join?pin=${pin}`)
  await page.getByLabel('Имя').fill(name)
  await page.getByRole('button', { name: 'Поехали!' }).click()
  await expect(page.getByRole('heading', { name: 'Вы в игре!' })).toBeVisible()
  return page
}
