'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Skeleton } from '#/components/ui/skeleton';
import { toast } from '#/components/ui/toast';
import { qk } from '#/hooks/useReferences';
import { getBusinesses } from '#/lib/server-fns/references';
import { updateBusiness } from '#/lib/server-fns/settings';

export function BusinessesPanel({ canManage }: { canManage: boolean }) {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: qk.businesses,
		queryFn: () => getBusinesses({ data: {} }),
	});
	const [editing, setEditing] = useState<Record<string, any>>({});
	const [uploading, setUploading] = useState<Record<string, boolean>>({});

	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const handleFileUpload = async (businessId: string, file: File) => {
		if (file.size > 500_000) {
			toast.add({
				title: 'File too large',
				description: 'Maximum 500KB',
				type: 'error',
			});
			return;
		}
		if (!file.type.startsWith('image/')) {
			toast.add({
				title: 'Invalid file',
				description: 'Must be an image',
				type: 'error',
			});
			return;
		}
		setUploading((s) => ({ ...s, [businessId]: true }));
		try {
			const base64 = await fileToBase64(file);
			setEditing((s) => ({
				...s,
				[businessId]: { ...s[businessId], logo: base64 },
			}));
			toast.add({ title: 'Logo uploaded', type: 'success' });
		} catch {
			toast.add({ title: 'Upload failed', type: 'error' });
		} finally {
			setUploading((s) => ({ ...s, [businessId]: false }));
		}
	};

	const removeLogo = (businessId: string) => {
		setEditing((s) => ({
			...s,
			[businessId]: { ...s[businessId], logo: null },
		}));
	};

	const upd = useMutation({
		mutationFn: (b: any) =>
			updateBusiness({
				data: { id: b.id, name: b.name, prefix: b.prefix, logo: b.logo },
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: qk.businesses });
			toast.add({ title: 'Business updated', type: 'success' });
		},
		onError: (e: any) => toast.add({ description: e.message, type: 'error' }),
	});

	if (isLoading) return <BusinessesPanelSkeleton />;
	const businesses = (data as any)?.businesses || [];

	return (
		<div className="flex flex-col gap-4">
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
				BUSINESSES & LOGOS — {businesses.length} total
			</div>
			<div className="flex flex-col gap-3">
				{businesses.map((b: any) => {
					const draft = editing[b.id] || { ...b };
					const set = (k: string, v: string) =>
						setEditing((s) => ({ ...s, [b.id]: { ...draft, [k]: v } }));
					return (
						<div
							key={b.id}
							className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-3"
						>
							<div className="grid gap-3 md:grid-cols-3">
								<div className="flex flex-col gap-1">
									<Label className="text-[11px] font-semibold">Name</Label>
									<Input
										value={draft.name}
										onChange={(e) => set('name', e.target.value)}
										className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]"
										disabled={!canManage}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label className="text-[11px] font-semibold">Prefix</Label>
									<Input
										value={draft.prefix}
										onChange={(e) => set('prefix', e.target.value)}
										className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]"
										disabled={!canManage}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label className="text-[11px] font-semibold">Logo</Label>
									<div className="flex flex-col gap-2">
										<Input
											type="file"
											accept="image/*"
											onChange={(e) =>
												e.target.files?.[0] &&
												handleFileUpload(b.id, e.target.files[0])
											}
											disabled={!canManage || uploading[b.id]}
											className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]"
										/>
										{draft.logo && (
											<div className="flex items-center gap-3">
												<img
													src={draft.logo}
													alt={draft.name}
													className="h-16 w-auto border border-[#d6d3d1] p-1"
												/>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => removeLogo(b.id)}
													disabled={!canManage}
													className="border border-[#c02a10] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#c02a10] hover:bg-[#fff2ef] rounded-none"
												>
													<Trash2Icon className="w-4 h-4 mr-1" /> Clear
												</Button>
											</div>
										)}
										{uploading[b.id] && (
											<div className="text-xs text-[#5c5755]">Uploading…</div>
										)}
									</div>
								</div>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										setEditing((s) => {
											const n = { ...s };
											delete n[b.id];
											return n;
										})
									}
									className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
									disabled={!canManage}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="default"
									size="sm"
									onClick={() =>
										upd.mutate({
											id: b.id,
											name: draft.name,
											prefix: draft.prefix,
											logo: draft.logo,
										})
									}
									disabled={upd.isPending || !canManage}
									className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-1.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
								>
									Save
								</Button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function BusinessesPanelSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-3 w-40 rounded-none" />
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					className="border-2 border-[#201e1d] bg-white p-4 space-y-3"
				>
					<div className="grid gap-3 md:grid-cols-3">
						<Skeleton className="h-10 w-full rounded-none" />
						<Skeleton className="h-10 w-full rounded-none" />
						<Skeleton className="h-16 w-full rounded-none" />
					</div>
				</div>
			))}
		</div>
	);
}
