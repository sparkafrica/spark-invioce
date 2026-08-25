import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getProducts } from '#/lib/server-fns/crm'
import { useQuery } from '@tanstack/react-query'
import { ProductForm } from '#/components/forms/ProductForm'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/products/$id/edit')({
  beforeLoad: async ({ params }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: `/products/${params.id}/edit` } })
    }
    return { user: session.user, session: session.session, productId: params.id }
  },
  component: EditProductPage,
})

function EditProductPage() {
  const match = Route.useMatch()
  const productId = (match?.loaderData as { productId: string } | undefined)?.productId || ''
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ data: {} }),
    enabled: !!productId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Product</h1>
          <Button variant="ghost"><Loader2 className="h-4 w-4 animate-spin" /></Button>
        </div>
        <div className="rounded-none border bg-white p-12  text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#5c5755]">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Product</h1>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load product: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const product = data?.products?.find((p) => p.id === productId)

  if (!product) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Product</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Product not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initialData = {
    name: product.name,
    description: product.description || '',
    cost: product.cost,
    currency: product.currency,
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <ProductForm initialData={initialData} isEditing={true} productId={productId} />
    </div>
  )
}
