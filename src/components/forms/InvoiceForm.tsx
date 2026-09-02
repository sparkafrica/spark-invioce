'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import * as v from 'valibot';
import { PaymentModal } from '#/components/invoice/PaymentModal';
import { Button } from '#/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#/components/ui/dialog';
import { Skeleton } from '#/components/ui/skeleton';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import { getErrorMessage } from '#/lib/errors';
import { createInvoice, updateInvoice } from '#/lib/server-fns/invoice-create';
import { recordPayment } from '#/lib/server-fns/payments';
import {
	getBanks,
	getBusinesses,
	getClients,
	getCompanies,
} from '#/lib/server-fns/references';
import {
	BusinessEntitySection,
	ClientSection,
	InvoiceSection,
	LineItemsSection,
	PaymentDestinationSection,
	TranchesSection,
} from './InvoiceFormSections';

const numberStringSchema = v.pipe(
	v.string(),
	v.regex(/^\d+(\.\d+)?$/, 'Must be a number'),
);

const itemSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	description: v.optional(v.string()),
	qty: numberStringSchema,
	cost: numberStringSchema,
	discountName: v.optional(v.string()),
	discountPct: v.optional(numberStringSchema),
	discountAmt: v.optional(numberStringSchema),
});

const trancheSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	deliverables: v.optional(v.string()),
	dueDate: v.optional(v.string()),
	amount: numberStringSchema,
	paid: v.optional(v.boolean()),
});

const paymentSchema = v.object({
	id: v.string(),
	amount: v.string(),
	note: v.optional(v.nullable(v.string())),
	recordedBy: v.string(),
	recordedAt: v.string(),
});

export const invoiceSchema = v.object({
	businessId: v.pipe(v.string(), v.minLength(1, 'Business is required')),
	companyId: v.pipe(v.string(), v.minLength(1, 'Company is required')),
	clientId: v.pipe(v.string(), v.minLength(1, 'Client is required')),
	issueDate: v.pipe(v.string(), v.minLength(1, 'Issue date is required')),
	dueDate: v.pipe(v.string(), v.minLength(1, 'Due date is required')),
	currency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
	taxName: v.pipe(v.string(), v.minLength(1, 'Tax name is required')),
	taxRate: numberStringSchema,
	number: v.optional(v.string()),
	description: v.optional(v.string()),
	memo: v.optional(v.string()),
	bankId: v.optional(v.string()),
	paymentType: v.union([v.literal('full'), v.literal('tranche')]),
	paymentMethod: v.union([v.literal('bank'), v.literal('link')]),
	payLink: v.optional(v.string()),
	payLinkLabel: v.optional(v.string()),
	payLinkCurrency: v.optional(v.string()),
	status: v.optional(
		v.union([
			v.literal('draft'),
			v.literal('sent'),
			v.literal('paid'),
			v.literal('part_paid'),
			v.literal('overdue'),
			v.literal('voided'),
		]),
	),
	items: v.pipe(
		v.array(itemSchema),
		v.minLength(1, 'At least one item is required'),
	),
	tranches: v.optional(v.array(trancheSchema)),
	payments: v.optional(v.array(paymentSchema)),
});
export type InvoiceFormValues = v.InferOutput<typeof invoiceSchema>;
export type InvoiceFormApi = ReturnType<typeof useForm>;

type ItemValue = {
	name: string;
	description?: string | null;
	qty: string;
	cost: string;
	discountName?: string | null;
	discountPct?: string;
	discountAmt?: string;
	sortOrder?: number;
};

type TrancheValue = {
	name: string;
	deliverables?: string | null;
	dueDate?: string | null;
	amount: string;
	paid?: boolean;
	sortOrder?: number;
};

type PaymentValue = {
	id: string;
	amount: string;
	note?: string | null;
	recordedBy: string;
	recordedAt: string;
};

interface InvoiceFormProps {
	initialData?: {
		businessId?: string;
		companyId?: string;
		clientId?: string;
		issueDate?: string | null;
		dueDate?: string | null;
		currency?: string;
		taxName?: string;
		taxRate?: string;
		number?: string;
		description?: string | null;
		memo?: string | null;
		bankId?: string | null;
		
		paymentType?: 'full' | 'tranche';
		paymentMethod?: 'bank' | 'link';
		payLink?: string | null;
		payLinkLabel?: string | null;
		payLinkCurrency?: string;
		status?: 'draft' | 'sent' | 'paid' | 'part_paid' | 'overdue' | 'voided';
		items?: ItemValue[];
		tranches?: TrancheValue[];
		payments?: PaymentValue[];
	};
	isEditing?: boolean;
	invoiceId?: string;
}

export function InvoiceForm({
	initialData,
	isEditing = false,
	invoiceId,
}: InvoiceFormProps) {
	const navigate = useNavigate();
	const { data: businessesData } = useQuery({
		queryKey: ['businesses'],
		queryFn: () => getBusinesses({ data: {} }),
	});

	const { data: companiesData } = useQuery({
		queryKey: ['companies'],
		queryFn: () => getCompanies({ data: {} }),
	});

	const { data: clientsData } = useQuery({
		queryKey: ['clients'],
		queryFn: () => getClients({ data: {} }),
	});

	const { data: _banksData } = useQuery({
		queryKey: ['banks'],
		queryFn: () => getBanks({ data: {} }),
	});

	const [_showTranches, _setShowTranches] = useState(
		initialData?.paymentType === 'tranche',
	);
	const [saveNote, setSaveNote] = useState('');
	const [collisionOpen, setCollisionOpen] = useState(false);
	const [suggestedNumber, setSuggestedNumber] = useState('');

	const parseSuggestedNumber = (message: string): string | null => {
		const m = message.match(/proceed with\s+(.+?)\?/i);
		return m ? m[1].trim() : null;
	};

	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState('');
	const [paymentNote, setPaymentNote] = useState('');

	const defaultItems: ItemValue[] = [
		{
			name: '',
			description: '',
			qty: '1',
			cost: '0',
			discountName: '',
			discountPct: '0',
			discountAmt: '0',
			sortOrder: 0,
		},
	];

	const defaultTranches: TrancheValue[] = [
		{
			name: '',
			deliverables: '',
			dueDate: '',
			amount: '0',
			paid: false,
			sortOrder: 0,
		},
	];

	const normalizeItem = (item: ItemValue, index: number) => ({
		name: item.name ?? '',
		description: item.description ?? '',
		qty: item.qty ?? '1',
		cost: item.cost ?? '0',
		discountName: item.discountName ?? '',
		discountPct: item.discountPct ?? '0',
		discountAmt: item.discountAmt ?? '0',
		sortOrder: item.sortOrder ?? index,
	});

	const normalizeTranche = (tranche: TrancheValue, index: number) => ({
		name: tranche.name ?? '',
		deliverables: tranche.deliverables ?? '',
		dueDate: tranche.dueDate ?? '',
		amount: tranche.amount ?? '0',
		paid: tranche.paid ?? false,
		sortOrder: tranche.sortOrder ?? index,
	});

	const defaultValues = {
		number: initialData?.number ?? '',
		businessId: initialData?.businessId ?? '',
		companyId: initialData?.companyId ?? '',
		clientId: initialData?.clientId ?? '',
		issueDate: initialData?.issueDate ?? new Date().toISOString().split('T')[0],
		dueDate:
			initialData?.dueDate ??
			new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0],
		currency: initialData?.currency ?? 'NGN',
		taxName: initialData?.taxName ?? 'VAT',
		taxRate: initialData?.taxRate ?? '7.50',
		description: initialData?.description ?? '',
		memo: initialData?.memo ?? '',
		bankId: initialData?.bankId ?? '',
		paymentType: (initialData?.paymentType ?? 'full') as 'full' | 'tranche',
		paymentMethod: (initialData?.paymentMethod ?? 'bank') as 'bank' | 'link',
		payLink: initialData?.payLink ?? '',
		payLinkLabel: initialData?.payLinkLabel ?? 'Pay online',
		payLinkCurrency: initialData?.payLinkCurrency ?? '',
		status: (initialData?.status ?? 'draft') as
			| 'draft'
			| 'sent'
			| 'paid'
			| 'part_paid'
			| 'overdue'
			| 'voided',
		items: (initialData?.items?.length ? initialData.items : defaultItems).map(
			normalizeItem,
		),
		tranches: (initialData?.tranches?.length
			? initialData.tranches
			: defaultTranches
		).map(normalizeTranche),
		payments: initialData?.payments ?? [],
	} satisfies InvoiceFormValues;

	const paymentMutation = useMutation({
		mutationFn: ({ amount, note }: { amount: string; note: string }) => {
			if (!invoiceId) throw new Error('Invoice ID is required');
			return recordPayment({ data: { invoiceId, amount, note } });
		},
		onSuccess: (result) => {
			toast.add({
				title: 'Payment recorded',
				description: `New status: ${result.newStatus}`,
				type: 'success',
			});
			setShowPaymentModal(false);
			setPaymentAmount('');
			setPaymentNote('');
			// Note: In a real app, you'd want to refetch the invoice data here
			// For now, the form will show the new payment after a refresh
		},
		onError: (e: unknown) => {
			toast.add({
				description: getErrorMessage(e, 'Failed to record payment'),
				type: 'error',
			});
		},
	});

	const handleRecordPayment = () => {
		if (!paymentAmount) return;
		paymentMutation.mutate({ amount: paymentAmount, note: paymentNote });
	};

	const form = useForm({
		defaultValues,
		validators: {
			onChange: ({ value }: { value: InvoiceFormValues }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					invoiceSchema,
				),
			onSubmit: ({ value }: { value: InvoiceFormValues }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					invoiceSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				const normalizedItems = value.items.map((item, index) => ({
					...item,
					sortOrder: item.sortOrder ?? index,
				}));
				const normalizedTranches = (value.tranches ?? []).map(
					(tranche, index) => ({
						...tranche,
						sortOrder: tranche.sortOrder ?? index,
					}),
				);
				const payload = {
					...value,
					items: normalizedItems,
					tranches: normalizedTranches,
					saveNote: saveNote || undefined,
				};
				if (isEditing && invoiceId) {
					await updateInvoice({ data: { ...payload, id: invoiceId } });
					toast.add({ title: 'Invoice updated successfully', type: 'success' });
					navigate({ to: `/invoices/${invoiceId}` });
				} else {
					const result = await createInvoice({ data: payload });
					toast.add({ title: 'Invoice created successfully', type: 'success' });
					navigate({ to: `/invoices/${result.invoiceId}` });
				}
			} catch (e: unknown) {
				if (import.meta.env.VITE_DEBUG === 'true') {
					console.debug('Invoice form submit errors', form.state.errors);
				}
				const msg = getErrorMessage(e, '');
				const suggested = parseSuggestedNumber(msg);
				if (msg.includes('Number already exists') && suggested) {
					setSuggestedNumber(suggested);
					setCollisionOpen(true);
					return;
				}
				toast.add({
					description: msg || 'Failed to save invoice',
					type: 'error',
				});
			}
		},
	}) as unknown as InvoiceFormApi;

	// biome-ignore lint/correctness/useExhaustiveDependencies: no need to include defaultValues or initialData in deps
	useEffect(() => {
		if (!initialData) return;

		const nextValues = {
			...defaultValues,
			...initialData,
			// Ensure nullable DB dates don't override defaults with null
			issueDate: initialData.issueDate ?? defaultValues.issueDate,
			dueDate: initialData.dueDate ?? defaultValues.dueDate,
			bankId: initialData.bankId ?? defaultValues.bankId,
			payLink: initialData.payLink ?? defaultValues.payLink,
			payLinkLabel: initialData.payLinkLabel ?? defaultValues.payLinkLabel,
			description: initialData.description ?? defaultValues.description,
			memo: initialData.memo ?? defaultValues.memo,
			currency: initialData.currency ?? defaultValues.currency,
			payLinkCurrency:
				initialData.payLinkCurrency ?? defaultValues.payLinkCurrency,
			items: (initialData.items?.length ? initialData.items : defaultItems).map(
				normalizeItem,
			),
			tranches: (initialData.tranches?.length
				? initialData.tranches
				: defaultTranches
			).map(normalizeTranche),
			payments: initialData.payments ?? [],
		} satisfies InvoiceFormValues;

		form.reset(nextValues);
	}, [form, initialData]);

	// const items = form.getFieldValue('items') as ItemValue[]
	// const tranches = form.getFieldValue('tranches') as TrancheValue[]

	// const calculateItemTotal = (item: ItemValue) => {
	//   const qty = Number(item.qty || 0)
	//   const cost = Number(item.cost || 0)
	//   const discountPct = Number(item.discountPct || 0)
	//   const discountAmt = Number(item.discountAmt || 0)
	//   const lineTotal = qty * cost
	//   const discountAmount = discountAmt + (lineTotal * discountPct / 100)
	//   return lineTotal - discountAmount
	// }

	// const calculateSubtotal = () => {
	//   return items.reduce((sum: number, item: ItemValue) => sum + calculateItemTotal(item), 0)
	// }

	// const calculateTax = () => {
	//   const subtotal = calculateSubtotal()
	//   const taxRate = Number(form.getFieldValue('taxRate') || 0)
	//   return subtotal * (taxRate / 100)
	// }

	if (!businessesData || !companiesData || !clientsData) {
		return (
			<div className="grid lg:grid-cols-[1.55fr_1fr] gap-8 p-6">
				<div className="space-y-4">
					<Skeleton className="h-8 w-40 rounded-none" />
					<Skeleton className="h-20 w-full rounded-none" />
					<Skeleton className="h-20 w-full rounded-none" />
					<Skeleton className="h-32 w-full rounded-none" />
				</div>
				<Skeleton className="h-64 w-full rounded-none" />
			</div>
		);
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		form.handleSubmit();
	};

	const editTitle = isEditing ? `Edit Invoice` : 'New invoice';

	return (
		<form
			onSubmit={handleSubmit}
			className="grid lg:grid-cols-[1.55fr_1fr] gap-8"
			style={{ padding: '28px 24px 56px', gap: 32 }}
		>
			{/* Left */}
			<div className="flex flex-col gap-24">
				<div className="flex items-end justify-between gap-16 border-b-2 border-[#201e1d] pb-12">
					<div className="text-[30px] font-bold tracking-[-0.02em] leading-none">
						{editTitle}
					</div>

					<div className="flex gap-8">
						<Button
							type="button"
							onClick={() => navigate({ to: '/invoices' })}
							className="border border-[#201e1d] bg-white px-13 py-10 text-[12px] font-semibold hover:bg-[#f0dcd8] rounded-none"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className="bg-[#ec3013] text-white border border-[#ec3013] px-14 py-10 text-[12px] font-semibold hover:bg-[#c02a10] rounded-none"
						>
							{isEditing ? 'Save invoice' : 'Create invoice'}
						</Button>
					</div>
				</div>

				<BusinessEntitySection form={form} />
				<InvoiceSection form={form} />
				<ClientSection form={form} />
				<LineItemsSection form={form} />
				<TranchesSection form={form} />
				<PaymentDestinationSection form={form} />
			</div>

			{/* Right sidebar — SAVE NOTE + COMMENTARY + HISTORY like template */}
			<div className="border-l-2 border-[#201e1d] pl-6.5 flex flex-col gap-20 lg:sticky lg:top-18 self-start">
				{/* Warning banner for paid/partially paid/voided invoices */}
				{isEditing &&
					initialData?.status &&
					['paid', 'part_paid', 'voided'].includes(initialData.status) && (
						<div className="rounded-none border bg-yellow-50 p-4 dark:bg-yellow-900/20 mb-4">
							<div className="flex items-start gap-2">
								<svg
									className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<title>Icon</title>
									<path
										fillRule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 002 0V6a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
								<div className="text-sm text-yellow-800 dark:text-yellow-200">
									<strong className="font-semibold">
										{initialData.status === 'paid' && 'Invoice is paid'}
										{initialData.status === 'part_paid' &&
											'Invoice is partially paid'}
										{initialData.status === 'voided' && 'Invoice is voided'}
									</strong>
									<p className="mt-1">
										{initialData.status === 'paid' &&
											'Editing a paid invoice may affect payment records. Consider creating a credit note instead.'}
										{initialData.status === 'part_paid' &&
											'Editing a partially paid invoice may affect payment allocation. Proceed with caution.'}
										{initialData.status === 'voided' &&
											'This invoice has been voided. Editing will reactivate it.'}
									</p>
								</div>
							</div>
						</div>
					)}

				<div>
					<div className="text-[10px] tracking-[0.12em] font-semibold mb-10">
						SAVE NOTE
					</div>
					<Textarea
						value={saveNote}
						onChange={(e) => setSaveNote(e.target.value)}
						placeholder="What changed and why — kept on the record"
						rows={3}
						className="w-full"
					/>
					<div className="text-[11px] text-[#5c5755] mt-8">
						Every save records who, when, each field changed (old → new), your
						note and a full snapshot.
					</div>
				</div>
				<div className="border-t-2 border-[#201e1d] pt-14">
					<div className="flex items-baseline justify-between gap-10 mb-10">
						<div className="text-[10px] tracking-[0.12em] font-semibold">
							COMMENTARY
						</div>
						<div className="text-[11px] text-[#5c5755]">0 comments</div>
					</div>
					<div className="text-xs text-[#5c5755] mb-12">
						Save the invoice first, then the team can comment on it.
					</div>
					<div className="border-t border-[#d6d3d1] pt-12">
						<div className="flex flex-col gap-8">
							<textarea
								rows={3}
								placeholder="Add a comment for the team"
								className="w-full border border-[#201e1d] bg-white px-4 py-3 text-[13px] rounded-none focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-0"
							/>
							<Button
								type="button"
								className="bg-[#201e1d] text-white border border-[#201e1d] px-12 py-9 text-[11px] font-semibold hover:bg-[#c02a10] rounded-none self-start"
							>
								Post comment
							</Button>
						</div>
						<div className="text-[12px] text-[#5c5755] mt-10">
							No comments yet. Anyone on the team can read and add them.
						</div>
					</div>
				</div>
				<div className="border-t-2 border-[#201e1d] pt-14">
					<div className="text-[10px] tracking-[0.12em] font-semibold mb-10">
						EDIT HISTORY
					</div>
					<div className="text-xs text-[#5c5755]">
						No history yet — first save will create an entry.
					</div>
				</div>

				{/* Payment History */}
				{isEditing &&
					initialData?.payments &&
					initialData.payments.length > 0 && (
						<div className="border-t-2 border-[#201e1d] pt-14">
							<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-12">
								PAYMENTS RECEIVED
							</div>
							<div className="space-y-2">
								{initialData.payments.map((p) => (
									<div
										key={p.id}
										className="flex justify-between gap-4 border-b border-[#d6d3d1] py-2 text-xs"
									>
										<div>
											<span className="font-semibold">{p.recordedAt}</span>
											{p.note && (
												<span className="text-[#5c5755] ml-2">· {p.note}</span>
											)}
											<div className="text-[10px] text-[#5c5755]">
												by {p.recordedBy}
											</div>
										</div>
										<span className="tabular-nums font-semibold text-[#ec3013]">
											{(() => {
												const cur = (initialData?.currency || 'NGN') as string;
												try {
													return new Intl.NumberFormat('en-NG', {
														style: 'currency',
														currency: cur,
														minimumFractionDigits: 2,
													}).format(Number(p.amount));
												} catch {
													return `${cur} ${Number(p.amount).toFixed(2)}`;
												}
											})()}
										</span>
									</div>
								))}
							</div>
							{invoiceId &&
								initialData.status !== 'paid' &&
								initialData.status !== 'voided' && (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => setShowPaymentModal(true)}
										className="mt-12 w-full border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#ec3013]"
									>
										Record Payment
									</Button>
								)}
						</div>
					)}
			</div>

			{/* dailog to resolve invioce id collision */}
			<Dialog open={collisionOpen} onOpenChange={setCollisionOpen}>
				<DialogContent className="rounded-none">
					<DialogHeader>
						<DialogTitle>Number already exists</DialogTitle>
						<DialogDescription>
							Number already exists — proceed with {suggestedNumber}?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setCollisionOpen(false)}
							className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="default"
							onClick={() => {
								(
									form as unknown as {
										setFieldValue: (name: string, value: string) => void;
									}
								).setFieldValue('number', suggestedNumber);
								setCollisionOpen(false);
								setTimeout(() => form.handleSubmit(), 0);
							}}
							className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] rounded-none"
						>
							Proceed with {suggestedNumber}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Payment Modal */}
			<PaymentModal
				isOpen={showPaymentModal}
				onClose={() => setShowPaymentModal(false)}
				onSubmit={handleRecordPayment}
				isPending={paymentMutation.isPending}
				invoice={{
					id: invoiceId!,
					number: form.getFieldValue('number') as string,
					total: 0, // Will be calculated from form values
					currency: form.getFieldValue('currency') as string,
					status: form.getFieldValue('status') as string,
					paymentType: form.getFieldValue('paymentType') as 'full' | 'tranche',
					tranches: (
						(form.getFieldValue('tranches') as TrancheValue[]) || []
					).map((t) => ({
						id: t.name, // Using name as id since form doesn't have id for new tranches
						name: t.name,
						amount: t.amount,
						paid: t.paid ?? false,
					})),
				}}
			/>
		</form>
	);
}
