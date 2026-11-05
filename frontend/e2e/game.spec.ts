import { expect, test } from '@playwright/test'
import { createQuiz, joinAsPlayer, register, startGame } from './helpers'

test('полная игра: конструктор, два игрока, переподключение, итоги и история', async ({ page, browser }) => {
  await register(page)
  await createQuiz(page, 'Проверка связи', [
    { text: 'Сколько будет 2 + 2?', options: ['3', '4', '5'], correct: 1 },
    { text: 'Какого цвета небо?', options: ['Голубое', 'Зелёное'], correct: 0 },
  ])

  const pin = await startGame(page, 'Проверка связи')
  await expect(page.getByRole('heading', { name: 'Ждём игроков' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать игру' })).toBeDisabled()

  const anya = await joinAsPlayer(browser, pin, 'Аня')
  const borya = await joinAsPlayer(browser, pin, 'Боря')
  await expect(page.getByRole('heading', { name: '2 игрока' })).toBeVisible()

  // обновление страницы не выкидывает из игры
  await borya.reload()
  await expect(borya.getByRole('heading', { name: 'Вы в игре!' })).toBeVisible()

  await page.getByRole('button', { name: 'Начать игру' }).click()
  await expect(page.getByRole('heading', { name: 'Сколько будет 2 + 2?' })).toBeVisible()

  // ответили оба - ответ показывается, не дожидаясь таймера
  await anya.getByRole('button', { name: /: 4$/ }).click()
  await expect(anya.getByText('Ответ принят - ждём остальных')).toBeVisible()
  await expect(page.getByText(/Ответили\s*1\s*из 2/)).toBeVisible()
  await borya.getByRole('button', { name: /: 5$/ }).click()

  await expect(page.getByRole('button', { name: /4, правильный ответ/ })).toBeVisible()
  await expect(anya.getByRole('heading', { name: 'Верно!' })).toBeVisible()
  await expect(borya.getByRole('heading', { name: 'Мимо' })).toBeVisible()
  await expect(borya.getByText('Правильный ответ: 4')).toBeVisible()

  await page.getByRole('button', { name: 'Следующий вопрос' }).click()
  await expect(anya.getByRole('heading', { name: 'Какого цвета небо?' })).toBeVisible()
  await anya.getByRole('button', { name: /Голубое/ }).click()
  await page.getByRole('button', { name: 'Показать ответ' }).click()
  await expect(borya.getByRole('heading', { name: 'Не успели' })).toBeVisible()

  await page.getByRole('button', { name: 'Итоги' }).click()
  await expect(page.getByRole('heading', { name: 'Игра окончена' })).toBeVisible()
  await expect(anya.getByRole('heading', { name: 'Победа!' })).toBeVisible()
  await expect(borya.getByRole('heading', { name: 'Игра окончена' })).toBeVisible()

  await page.getByRole('link', { name: 'История игр' }).click()
  const game = page.locator('details').filter({ hasText: 'Проверка связи' })
  await expect(game).toContainText('2 игрока')
  await game.locator('summary').click()
  await expect(game.getByRole('row', { name: /Аня/ })).toContainText('2')
})

test('нельзя войти по несуществующему коду', async ({ page }) => {
  await page.goto('/join')
  await page.getByLabel('Код игры').fill('000001')
  await page.getByRole('button', { name: 'Дальше' }).click()
  await expect(page.getByRole('alert')).toHaveText('игра с таким кодом не найдена')
})

test('чужую игру нельзя открыть как ведущий', async ({ page, browser }) => {
  await register(page, 'Первая')
  await createQuiz(page, 'Моя игра', [{ text: 'Вопрос?', options: ['да', 'нет'], correct: 0 }])
  const pin = await startGame(page, 'Моя игра')

  const other = await browser.newPage()
  await register(other, 'Вторая')
  await other.goto(`/host/${pin}`)
  await expect(other.getByRole('heading', { name: 'Это не ваша игра' })).toBeVisible()
})
