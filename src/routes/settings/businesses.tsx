import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { SettingsLayout } from '#/components/settings/SettingsLayout'

export const Route = createFileRoute('/settings/businesses')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/auth/login', search: { redirect: '/settings/businesses' } })
    return { user: session.user }
  },
  component: () => <SettingsLayout />,
})
