import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { ProductForm } from '#/components/forms/ProductForm'

export const Route = createFileRoute('/products/new')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/products/new' } })
    }
    return { user: session.user, session: session.session }
  },
  component: NewProductPage,
})

function NewProductPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <ProductForm />
    </div>
  )
}
