import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('sign in page renders with split layout', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('SIGN IN')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('can sign in with demo account', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('clinton@sparkafrica.co')
    await page.getByLabel('Password').fill('spark')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText('Overview')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Better Auth returns error, should stay on login
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.getByText('FORGOT PASSWORD')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
  })
})
