import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getClients } from '#/lib/server-fns/references'
import { deleteClient } from '#/lib/server-fns/crm'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { EditIcon, Trash2Icon, SearchIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '#/components/ui/toast'

export const Route = createFileRoute('/clients/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/clients' } })
    }
    return { user: session.user, session: session.session }
  },
  component: ClientsPage,
})

function ClientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients({ data: {} }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient({ data: { id } }),
    onSuccess: () => {
      refetch()
      toast.add({ title: 'Client deleted', type: 'success' })
    },
    onError: (err) => {
      toast.add({ title: 'Error', description: (err as Error).message, type: 'error' })
    },
  })

  const clients = data?.clients || []
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Clients</h1>
          <Button onClick={() => navigate({ to: '/clients/new' })}>New Client</Button>
        </div>
        <div className="rounded-none border bg-white p-12  text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#5c5755]">Loading clients...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Clients</h1>
          <Button onClick={() => navigate({ to: '/clients/new' })}>New Client</Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load clients: {(error as Error).message}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <Loader2Icon className="h-4 w-4 mr-1 animate-spin" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Clients</h1>
          <p className="text-[#5c5755]">{filteredClients.length} client(s)</p>
        </div>
        <Button onClick={() => navigate({ to: '/clients/new' })}>New Client</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-none bg-white"
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#5c5755]">No clients found. Create your first client to get started.</p>
              <Button onClick={() => navigate({ to: '/clients/new' })} className="mt-4">New Client</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f3f2f2]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-[#f3f2f2] dark:hover:bg-white/50">
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-gray-600">{client.contact || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{client.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{client.reg || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/clients/${client.id}/edit` })}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(client.id)} disabled={deleteMutation.isPending}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
