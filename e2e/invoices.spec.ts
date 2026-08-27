import { test, expect } from '@playwright/test'

test.describe('Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('clinton@sparkafrica.co')
    await page.getByLabel('Password').fill('spark')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await page.goto('/invoices')
    await expect(page.getByText('Invoices')).toBeVisible()
  })

  test('lists invoices and can open', async ({ page }) => {
    await expect(page.getByText('NUMBER')).toBeVisible()
    // Empty state or rows
    const hasRows = await page.getByText('Open').count()
    if (hasRows > 0) {
      await page.getByText('Open').first().click()
      await expect(page).toHaveURL(/\/invoices\//)
    } else {
      await expect(page.getByText('No invoices found')).toBeVisible()
    }
  })

  test('can navigate to new invoice', async ({ page }) => {
    await page.getByRole('link', { name: 'New invoice' }).click()
    await expect(page).toHaveURL(/\/invoices\/new/)
    await expect(page.getByText('New invoice')).toBeVisible()
  })

  test('new invoice form allows input', async ({ page }) => {
    await page.goto('/invoices/new')
    // Check that at least one input is editable
    const nameInput = page.getByPlaceholder('e.g. Mobilisation').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Service')
      await expect(nameInput).toHaveValue('Test Service')
    }
  })
})
