import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getProducts } from '#/lib/server-fns/crm'
import { deleteProduct } from '#/lib/server-fns/crm'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { EditIcon, Trash2Icon, SearchIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '#/components/ui/toast'

export const Route = createFileRoute('/products/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/products' } })
    }
    return { user: session.user, session: session.session }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ data: {} }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => {
      refetch()
      toast.add({ title: 'Product deleted', type: 'success' })
    },
    onError: (err) => {
      toast.add({ title: 'Error', description: (err as Error).message, type: 'error' })
    },
  })

  const products = data?.products || []
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  )

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Products & Services</h1>
          <Button onClick={() => navigate({ to: '/products/new' })}>New Product</Button>
        </div>
        <div className="rounded-none border bg-white p-12  text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#5c5755]">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Products & Services</h1>
          <Button onClick={() => navigate({ to: '/products/new' })}>New Product</Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load products: {(error as Error).message}</p>
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
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Products & Services</h1>
          <p className="text-[#5c5755]">{filteredProducts.length} product(s)</p>
        </div>
        <Button onClick={() => navigate({ to: '/products/new' })}>New Product</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-none bg-white"
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#5c5755]">No products found. Create your first product to get started.</p>
              <Button onClick={() => navigate({ to: '/products/new' })} className="mt-4">New Product</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f3f2f2]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#f3f2f2] dark:hover:bg-white/50">
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-gray-600">{product.description || '-'}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(product.cost)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{product.currency}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/products/${product.id}/edit` })}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(product.id)} disabled={deleteMutation.isPending}>
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
