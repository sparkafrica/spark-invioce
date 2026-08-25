import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { ClientForm } from '#/components/forms/ClientForm'

export const Route = createFileRoute('/clients/new')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/clients/new' } })
    }
    return { user: session.user, session: session.session }
  },
  component: NewClientPage,
})

function NewClientPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <ClientForm />
    </div>
  )
}
