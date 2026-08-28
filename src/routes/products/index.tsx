import { createFileRoute, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';
import { getProducts, deleteProduct } from '#/lib/server-fns/crm';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ProductForm } from '#/components/forms/ProductForm';
import { Button } from '#/components/ui/button';
import { Card, CardContent } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { Input } from '#/components/ui/input';
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from '#/components/ui/table';
import { EditIcon, Trash2Icon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from '#/components/ui/toast';
import { Skeleton } from '#/components/ui/skeleton';
import { Dialog, DialogContent } from '#/components/ui/dialog';

export const Route = createFileRoute('/products/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: '/auth/login', search: { redirect: '/products' } });
		}
		return { user: session.user, session: session.session };
	},
	component: ProductsPage,
});

function ProductsPage() {
	const [search, setSearch] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [addFormKey, setAddFormKey] = useState(0);
	const { data, isLoading, refetch } = useQuery({
		queryKey: ['products'],
		queryFn: () => getProducts({ data: {} }),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteProduct({ data: { id } }),
		onSuccess: () => {
			refetch();
			toast.add({ title: 'Product deleted', type: 'success' });
		},
		onError: (err) => {
			toast.add({ description: (err as Error).message, type: 'error' });
		},
	});

	const products = data?.products || [];

	const editingProduct = editingId
		? products.find((p) => p.id === editingId)
		: null;

	const filteredProducts = products.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.description?.toLowerCase().includes(search.toLowerCase()),
	);

	if (isLoading) {
		return (
			<div className="grid lg:grid-cols-[1.5fr_1fr] gap-9 items-start">
				<div>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
								Products & Services
							</h1>
							<Skeleton className="h-4 w-24 rounded-none mt-2" />
						</div>
					</div>
					<div className="rounded-none border-2 border-[#201e1d] bg-white p-4 space-y-3">
						<Skeleton className="h-6 w-full rounded-none" />
						<Skeleton className="h-6 w-full rounded-none" />
						<Skeleton className="h-6 w-full rounded-none" />
					</div>
				</div>
				<div className="border-l-2 border-[#201e1d] pl-7">
					<div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
						ADD A PRODUCT OR SERVICE
					</div>
					<div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
						<Skeleton className="h-9 w-full rounded-none" />
						<Skeleton className="h-9 w-full rounded-none" />
						<Skeleton className="h-20 w-full rounded-none" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grid lg:grid-cols-[1.5fr_1fr] gap-9 items-start">
			<div>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
							Products & Services
						</h1>
						<p className="text-[#5c5755]">{products.length} product(s)</p>
					</div>
				</div>

				<Card>
					<CardContent className="p-0">
						<div className="p-4 border-b-2 border-[#201e1d]">
							<div className="relative max-w-md">
								<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5c5755]" />
								<Input
									type="text"
									placeholder="Search products..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-[#201e1d] bg-white rounded-none"
								/>
							</div>
						</div>

						{products.length === 0 ? (
							<div className="p-12 text-center">
								<p className="text-[#5c5755]">
									No products found. Create your first product to get started.
								</p>
							</div>
						) : (
							<Table className="bg-white">
								<TableHeader className="bg-[#f3f2f2]">
									<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											NAME
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											DESCRIPTION
										</TableHead>
										<TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											COST
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											CURRENCY
										</TableHead>
										<TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											ACTIONS
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="divide-y divide-[#d6d3d1]">
									{filteredProducts.map((product) => (
										<TableRow key={product.id} className="hover:bg-[#f0dcd8]">
											<TableCell className="px-4 py-3 font-medium">
												{product.name}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{product.description || '-'}
											</TableCell>
											<TableCell className="px-4 py-3 text-right font-mono">
												{new Intl.NumberFormat('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												}).format(Number(product.cost))}
											</TableCell>
											<TableCell className="px-4 py-3">
												<Badge variant="secondary">{product.currency}</Badge>
											</TableCell>
											<TableCell className="px-4 py-3 text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setEditingId(product.id)}
													>
														<EditIcon className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-[#c02a10]"
														onClick={() => deleteMutation.mutate(product.id)}
														disabled={deleteMutation.isPending}
													>
														<Trash2Icon className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="border-l-2 border-[#201e1d] pl-7">
				<div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
					ADD A PRODUCT OR SERVICE
				</div>
				<ProductForm
					key={addFormKey}
					isEditing={false}
					onCancel={() => setAddFormKey((k) => k + 1)}
					onSuccess={() => {
						refetch();
						setAddFormKey((k) => k + 1);
					}}
				/>
			</div>

			<Dialog
				open={!!editingId}
				onOpenChange={(open) => {
					if (!open) setEditingId(null);
				}}
			>
				<DialogContent className="rounded-none max-w-xl max-h-[90vh] overflow-y-auto">
					{editingProduct && (
						<ProductForm
							key={editingProduct.id}
							initialData={{
								name: editingProduct.name,
								description: editingProduct.description || '',
								cost: editingProduct.cost,
								currency: editingProduct.currency,
							}}
							isEditing={true}
							productId={editingId!}
							onCancel={() => setEditingId(null)}
							onSuccess={() => {
								refetch();
								setEditingId(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
