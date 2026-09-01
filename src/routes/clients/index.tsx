import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { EditIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { ClientForm } from '#/components/forms/ClientForm';
import { Button } from '#/components/ui/button';
import { Card, CardContent } from '#/components/ui/card';
import { Dialog, DialogContent } from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Skeleton } from '#/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import { toast } from '#/components/ui/toast';
import { qk } from '#/hooks/useReferences';
import { getSession } from '#/lib/auth.functions';
import { deleteClient, getClients } from '#/lib/server-fns/references';

export const Route = createFileRoute('/clients/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: '/auth/login', search: { redirect: '/clients' } });
		}
		return { user: session.user, session: session.session };
	},
	component: ClientsPage,
});

function ClientsPage() {
	const [search, setSearch] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [addFormKey, setAddFormKey] = useState(0);
	const { data, isLoading, refetch } = useQuery({
		queryKey: qk.clients,
		queryFn: () => getClients({ data: {} }),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteClient({ data: { id } }),
		onSuccess: () => {
			refetch();
			toast.add({ title: 'Client deleted', type: 'success' });
		},
		onError: (err) => {
			toast.add({ description: (err as Error).message, type: 'error' });
		},
	});

	const clients = data?.clients || [];

	const editingClient = editingId
		? clients.find((c) => c.id === editingId)
		: null;

	const filteredClients = clients.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.email?.toLowerCase().includes(search.toLowerCase()) ||
			p.contact?.toLowerCase().includes(search.toLowerCase()),
	);

	if (isLoading) {
		return (
			<div className="grid lg:grid-cols-[1.5fr_1fr] gap-9 items-start">
				<div>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
								Clients
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
						ADD A CLIENT
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
							Clients
						</h1>
						<p className="text-[#5c5755]">{clients.length} client(s)</p>
					</div>
				</div>

				<Card>
					<CardContent className="p-0">
						<div className="p-4 border-b-2 border-[#201e1d]">
							<div className="relative max-w-md">
								<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5c5755]" />
								<Input
									type="text"
									placeholder="Search clients..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-[#201e1d] bg-white rounded-none"
								/>
							</div>
						</div>

						{clients.length === 0 ? (
							<div className="p-12 text-center">
								<p className="text-[#5c5755]">
									No clients found. Create your first client to get started.
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
											CONTACT
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											EMAIL
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											REGISTRATION
										</TableHead>
										<TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											ACTIONS
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="divide-y divide-[#d6d3d1]">
									{filteredClients.map((client) => (
										<TableRow key={client.id} className="hover:bg-[#f0dcd8]">
											<TableCell className="px-4 py-3 font-medium">
												{client.name}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{client.contact || '-'}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{client.email || '-'}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{client.reg || '-'}
											</TableCell>
											<TableCell className="px-4 py-3 text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setEditingId(client.id)}
													>
														<EditIcon className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-[#c02a10]"
														onClick={() => deleteMutation.mutate(client.id)}
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
					ADD A CLIENT
				</div>
				<ClientForm
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
					<p className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
						EDIT CLIENT
					</p>
					{editingClient && (
						<ClientForm
							key={editingClient.id}
							initialData={{
								name: editingClient.name,
								reg: editingClient.reg || '',
								address: editingClient.address || '',
								email: editingClient.email || '',
								contact: editingClient.contact || '',
								notes: editingClient.notes || '',
							}}
							isEditing={true}
								clientId={editingClient.id}
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
