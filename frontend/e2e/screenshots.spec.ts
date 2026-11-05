import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { joinAsPlayer, loginDemo, startGame } from './helpers'

// скриншоты для README: SCREENSHOT_DIR=../docs/screenshots npx playwright test screenshots
const dir = process.env.SCREENSHOT_DIR

test.skip(!dir, 'SCREENSHOT_DIR не задан')
test.setTimeout(120_000)

const shot = async (page: Page, name: string) => {
  // даём анимациям доиграть
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(dir!, `${name}.png`), scale: 'css' })
}

test('скриншоты для README', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/')
  await shot(page, 'landing')

  await loginDemo(page)
  await shot(page, 'dashboard')

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Фронтенд за пять минут' })
    .getByRole('link', { name: 'Изменить' })
    .click()
  await expect(page.getByLabel('Название')).toHaveValue('Фронтенд за пять минут')
  await shot(page, 'editor')

  await page.goto('/app')
  const pin = await startGame(page, 'Фронтенд за пять минут')
  const players = [
    await joinAsPlayer(browser, pin, 'Маша'),
    await joinAsPlayer(browser, pin, 'Тимур'),
    await joinAsPlayer(browser, pin, 'Лёва'),
  ]
  await joinAsPlayer(browser, pin, 'Катя К.')
  await shot(page, 'host-lobby')

  await page.getByRole('button', { name: 'Начать игру' }).click()
  await expect(players[0].getByRole('heading', { name: /побочных эффектов/ })).toBeVisible()
  await shot(page, 'host-question')
  await shot(players[0], 'player-question')

  await players[0].getByRole('button', { name: /useEffect/ }).click()
  await players[1].getByRole('button', { name: /useEffect/ }).click()
  await players[2].getByRole('button', { name: /useMemo/ }).click()
  await page.getByRole('button', { name: 'Показать ответ' }).click()
  await expect(page.getByRole('heading', { name: 'Лидеры' })).toBeVisible()
  await shot(page, 'host-reveal')
  await shot(players[0], 'player-reveal')

  // оставшиеся вопросы проходим быстро, ответы через один верные
  for (let i = 1; i < 5; i++) {
    await page.getByRole('button', { name: 'Следующий вопрос' }).click()
    await expect(page.getByRole('button', { name: 'Показать ответ' })).toBeVisible()
    for (const [k, p] of players.entries()) {
      const option = (i + k) % 2 === 0 ? 1 : 0
      await p
        .getByRole('button', { name: /^(солнце|месяц|облако|цветок):/ })
        .nth(option)
        .click()
    }
    await page.getByRole('button', { name: 'Показать ответ' }).click()
  }

  await page.getByRole('button', { name: 'Итоги' }).click()
  await expect(page.getByRole('heading', { name: 'Игра окончена' })).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, 'host-podium')
  await shot(players[0], 'player-finished')

  await page.goto('/app/history')
  await page.locator('details').first().locator('summary').click()
  await shot(page, 'history')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await mobile.goto('/')
  await shot(mobile, 'landing-mobile')
})
