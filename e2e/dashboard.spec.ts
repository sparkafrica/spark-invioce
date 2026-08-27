import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('clinton@sparkafrica.co')
    await page.getByLabel('Password').fill('spark')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('renders overview with filters', async ({ page }) => {
    await expect(page.getByText('Overview')).toBeVisible()
    await expect(page.getByText('BUSINESS')).toBeVisible()
    await expect(page.getByText('CURRENCY')).toBeVisible()
    await expect(page.getByText('PERIOD')).toBeVisible()
    await expect(page.getByText('TOTAL INVOICED')).toBeVisible()
  })

  test('business filter toggles', async ({ page }) => {
    const allBtn = page.getByRole('button', { name: 'All', exact: true }).first()
    const nbBtn = page.getByRole('button', { name: 'New Business' })
    await expect(allBtn).toHaveClass(/bg-\[#201e1d\]/)
    await nbBtn.click()
    await expect(nbBtn).toHaveClass(/bg-\[#201e1d\]/)
  })

  test('has no horizontal overflow', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('vertical scroll works', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 100))
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(0)
  })
})
