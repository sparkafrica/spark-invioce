// @ts-nocheck
'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { CheckIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { CurrencySelect } from '#/components/ui/currency-select';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '#/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { NumberInput } from '#/components/ui/number-input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import {
	useBanks,
	useBusinesses,
	useClients,
	useCompanies,
	useProducts,
} from '#/hooks/useReferences';
import { getErrorMessage } from '#/lib/errors';
import { createClient } from '#/lib/server-fns/crm';
import { getLatestInvoiceNumber } from '#/lib/server-fns/invoice-create';
import type { InvoiceFormApi } from './InvoiceForm';

export function BusinessEntitySection({ form }: { form: InvoiceFormApi }) {
	const { data: businessesData, isLoading: loadingBiz } = useBusinesses();
	const { data: companiesData, isLoading: loadingComp } = useCompanies();

	if (loadingBiz || loadingComp) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-3 w-40 rounded-none" />
				<div className="grid grid-cols-2 gap-3">
					<Skeleton className="h-9 w-full rounded-none" />
					<Skeleton className="h-9 w-full rounded-none" />
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
				BUSINESS & INVOICING ENTITY
			</div>
			<div className="grid grid-cols-2 gap-3">
				<form.Field name="businessId">
					{(field) => (
						<Field>
							<FieldLabel>Business / event</FieldLabel>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											variant="outline"
											className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
										>
											{businessesData?.businesses?.find(
												(b: { id: string; name: string }) =>
													b.id === field.state.value,
											)?.name || 'Select business'}
											<ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
										</Button>
									}
								></PopoverTrigger>
								<PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
									<Command>
										<CommandInput
											placeholder="Search business…"
											className="h-9 border-b border-[#d6d3d1] rounded-none"
										/>
										<CommandList>
											<CommandEmpty>No business found.</CommandEmpty>
											<CommandGroup>
												{businessesData?.businesses?.map((b) => (
													<CommandItem
														key={b.id}
														value={b.name}
														onSelect={() => field.handleChange(b.id)}
														className="rounded-none"
														data-checked={field.state.value === b.id}
													>
														{b.name}
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				<form.Field name="companyId">
					{(field) => (
						<Field>
							<FieldLabel>Invoicing company</FieldLabel>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											variant="outline"
											className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
										>
											{companiesData?.companies?.find(
												(c: { id: string; name: string }) =>
													c.id === field.state.value,
											)?.name || 'Select company'}
											<ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
										</Button>
									}
								></PopoverTrigger>
								<PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
									<Command>
										<CommandInput
											placeholder="Search company…"
											className="h-9 border-b border-[#d6d3d1] rounded-none"
										/>
										<CommandList>
											<CommandEmpty>No company found.</CommandEmpty>
											<CommandGroup>
												{companiesData?.companies?.map(
													(c: { id: string; name: string }) => (
														<CommandItem
															key={c.id}
															value={c.name}
															onSelect={() => field.handleChange(c.id)}
															className="rounded-none"
															data-checked={field.state.value === c.id}
														>
															{c.name}
														</CommandItem>
													),
												)}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
		</div>
	);
}

export function InvoiceSection({ form }: { form: InvoiceFormApi }) {
	const handleAutoNumber = async () => {
		const businessId = form.getFieldValue('businessId') as string | undefined;
		if (!businessId) {
			toast.add({ description: 'Select a business first', type: 'error' });
			return;
		}
		try {
			const res = await getLatestInvoiceNumber({ data: { businessId } });
			form.setFieldValue('number', res.nextNumber);
		} catch (e: unknown) {
			toast.add({ description: getErrorMessage(e), type: 'error' });
		}
	};

	return (
		<div>
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
				INVOICE
			</div>
			<div className="grid grid-cols-4 gap-3">
				<form.Field name="number">
					{(field) => (
						<Field>
							<FieldLabel>Invoice number</FieldLabel>
							<div className="grid grid-cols-[1fr_auto] gap-1.5">
								<Input
									value={field.state.value || ''}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="SPK-2026-…"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAutoNumber}
									className="border border-[#201e1d] bg-white px-2.5 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none"
								>
									Auto
								</Button>
							</div>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="issueDate">
					{(field) => (
						<Field>
							<FieldLabel>Date of issue *</FieldLabel>
							<Input
								type="date"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="dueDate">
					{(field) => (
						<Field>
							<FieldLabel>Due date *</FieldLabel>
							<Input
								type="date"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="currency">
					{(field) => (
						<Field>
							<FieldLabel>Currency *</FieldLabel>
							<CurrencySelect
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v)}
								placeholder="Search currency..."
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
			<div className="mt-3 grid gap-3">
				<form.Field name="description">
					{(field) => (
						<Field>
							<FieldLabel>Invoice description</FieldLabel>
							<Textarea
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="What this invoice is for — appears under Re: on the document"
								rows={2}
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-3">
				<form.Field name="taxName">
					{(field) => (
						<Field>
							<FieldLabel>Tax / fee name</FieldLabel>
							<Input
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="VAT"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="taxRate">
					{(field) => (
						<Field>
							<FieldLabel>Rate (%)</FieldLabel>
							<Input
								type="text"
								inputMode="decimal"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
		</div>
	);
}

export function ClientSection({ form }: { form: InvoiceFormApi }) {
	const { data: clientsData, isLoading } = useClients();
	const [showNewClientDialog, setShowNewClientDialog] = useState(false);

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-3 w-20 rounded-none" />
				<div className="grid grid-cols-[1fr_1.4fr] gap-4">
					<Skeleton className="h-9 w-full rounded-none" />
					<Skeleton className="h-9 w-24 rounded-none" />
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
				CLIENT
			</div>
			<div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
				<div className="space-y-2">
					<form.Field name="clientId">
						{(field) => (
							<Field>
								<FieldLabel>Client</FieldLabel>
								<Popover>
									<PopoverTrigger
										render={
											<Button
												variant="outline"
												className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
											>
												{clientsData?.clients?.find(
													(c: { id: string; name: string }) =>
														c.id === field.state.value,
												)?.name || 'Select client'}
												<ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
											</Button>
										}
									></PopoverTrigger>
									<PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
										<Command>
											<CommandInput
												placeholder="Search client…"
												className="h-9 border-b border-[#d6d3d1] rounded-none"
											/>
											<CommandList>
												<CommandEmpty>No client found.</CommandEmpty>
												<CommandGroup>
													{clientsData?.clients?.map((c) => (
														<CommandItem
															key={c.id}
															value={c.name}
															onSelect={() => field.handleChange(c.id)}
															className="rounded-none"
														>
															{c.name}
															{field.state.value === c.id && (
																<CheckIcon className="ml-auto h-4 w-4" />
															)}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<Button
						type="button"
						onClick={() => setShowNewClientDialog(true)}
						size="sm"
						className="self-start border border-[#201e1d] text-black bg-transparent w-min text-xs hover:bg-[#f0dcd8]"
					>
						+ New client
					</Button>
				</div>
				<form.Field name="clientId">
					{(field) => {
						const selected = clientsData?.clients?.find(
							(c: { id: string; name: string }) => c.id === field.state.value,
						);
						if (!selected) return null;
						return (
							<div className="border-l-2 border-[#201e1d] pl-3.5 text-xs leading-5 mt-3">
								<div className="font-semibold">{selected.name}</div>
								<div className="text-[#5c5755]">{selected.reg || '—'}</div>
								<div className="text-[#5c5755]">{selected.address || '—'}</div>
								<div className="text-[#5c5755]">
									{selected.contact || ''} — {selected.email || '—'}
								</div>
							</div>
						);
					}}
				</form.Field>
			</div>
			<Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
				<DialogContent className="max-w-125">
					<DialogHeader>
						<DialogTitle>New Client</DialogTitle>
						<DialogDescription>
							Add a new client to use in this invoice
						</DialogDescription>
					</DialogHeader>
					<NewClientForm onSuccess={() => setShowNewClientDialog(false)} />
				</DialogContent>
			</Dialog>
		</>
	);
}

const NewClientForm = ({ onSuccess }: { onSuccess: () => void }) => {
	const clientSchema = v.object({
		name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
		email: v.optional(v.string()),
		contact: v.optional(v.string()),
		reg: v.optional(v.string()),
		address: v.optional(v.string()),
		notes: v.optional(v.string()),
	});

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			contact: '',
			reg: '',
			address: '',
			notes: '',
		},
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					clientSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					clientSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				await createClient({ data: value });
				toast.add({ title: 'Client created', type: 'success' });
				onSuccess();
			} catch (error) {
				toast.add({ description: (error as Error).message, type: 'error' });
			}
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		form.handleSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
			<div className="grid gap-3 md:grid-cols-2">
				<form.Field name="name">
					{(field) => (
						<Field>
							<FieldLabel>Name *</FieldLabel>
							<Input
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="B4B Partners Limited"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="email">
					{(field) => (
						<Field>
							<FieldLabel>Email</FieldLabel>
							<Input
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="you@client.co"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="contact">
					{(field) => (
						<Field>
							<FieldLabel>Contact person</FieldLabel>
							<Input
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="Chinapa Onwusah"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="reg">
					{(field) => (
						<Field>
							<FieldLabel>Registration no.</FieldLabel>
							<Input
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								placeholder="RC 7347187"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<div className="md:col-span-2">
					<form.Field name="address">
						{(field) => (
							<Field>
								<FieldLabel>Address</FieldLabel>
								<Textarea
									value={field.state.value || ''}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Road 13, Ikota Villa Estate, Ajah…"
									rows={2}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>
				<div className="md:col-span-2">
					<form.Field name="notes">
						{(field) => (
							<Field>
								<FieldLabel>About the client</FieldLabel>
								<Textarea
									value={field.state.value || ''}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Internal notes…"
									rows={3}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					onClick={onSuccess}
					className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
				>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							variant="default"
							disabled={!canSubmit || isSubmitting}
							className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
						>
							{isSubmitting ? 'Saving…' : 'Save and use'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
};

export function LineItemsSection({ form }: { form: InvoiceFormApi }) {
	const { data: productsData } = useProducts();

	return (
		<div>
			<div className="flex items-end justify-between gap-4 mb-3">
				<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
					PRODUCTS & SERVICES
				</div>
				<form.Field name="items" mode="array">
					{(field) => (
						<div className="flex gap-2">
							<Button
								type="button"
								onClick={() =>
									field.pushValue({
										name: '',
										description: '',
										qty: '1',
										cost: '0',
										discountName: '',
										discountPct: '0',
										discountAmt: '0',
										sortOrder: field.state.value.length,
									})
								}
								size="sm"
								className="border border-[#201e1d] bg-white text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]"
							>
								Add blank line
							</Button>
							{field.state.value.length > 1 && (
								<Button
									type="button"
									size="sm"
									onClick={() => {
										const items = field.state.value as ItemValue[];
										const total = items.reduce(
											(sum: number, it: any) =>
												sum + Number(it.qty || 0) * Number(it.cost || 0),
											0,
										);
										const split = total / items.length;
										const newItems = items.map((it, i: number) => ({
											...it,
											cost: (split / Number(it.qty || 1)).toFixed(2),
											sortOrder: i,
										}));
										field.handleChange(newItems);
									}}
									className="border border-[#201e1d] bg-white text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]"
								>
									Split evenly
								</Button>
							)}
						</div>
					)}
				</form.Field>
			</div>

			{productsData?.products && productsData.products.length > 0 && (
				<div className="mb-3 flex flex-wrap gap-2">
					{productsData.products
						.slice(0, 6)
						.map(
							(p: {
								id: string;
								name: string;
								description: string | null;
								cost: string;
							}) => (
								<form.Field key={p.id} name="items" mode="array">
									{(field) => (
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												field.pushValue({
													name: p.name,
													description: p.description || '',
													qty: '1',
													cost: p.cost,
													discountName: '',
													discountPct: '0',
													discountAmt: '0',
													sortOrder: field.state.value.length,
												})
											}
											className="h-7 px-2 text-[11px] rounded-none border-[#201e1d] hover:bg-[#f0dcd8]"
										>
											<PlusIcon className="h-3 w-3 mr-1" />
											{p.name}
										</Button>
									)}
								</form.Field>
							),
						)}
				</div>
			)}

			<form.Field name="items" mode="array">
				{(field) => (
					<div className="space-y-2">
						{field.state.value.map((_, index: number) => (
							<div
								key={index}
								className="grid grid-cols-[1fr_80px_90px_80px_40px] gap-2 items-start p-2 border border-[#d6d3d1] bg-white"
							>
								<form.Field name={`items[${index}].name`}>
									{(sub) => (
										<Field>
											<Input
												value={sub.state.value}
												onChange={(e) => sub.handleChange(e.target.value)}
												onBlur={sub.handleBlur}
												placeholder="Item name"
												className="h-9 px-2.5 text-[13px]"
											/>
											<FieldError errors={sub.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								<form.Field name={`items[${index}].qty`}>
									{(sub) => (
										<Field>
											<NumberInput
												value={sub.state.value ? Number(sub.state.value) : 0}
												onValueChange={(nextValue) => {
													sub.handleChange(
														nextValue === null ? '' : nextValue.toFixed(2),
													);
												}}
												onBlur={sub.handleBlur}
												placeholder="Qty"
												className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
											/>
											<FieldError errors={sub.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								<form.Field name={`items[${index}].cost`}>
									{(sub) => (
										<Field>
											<NumberInput
												value={sub.state.value ? Number(sub.state.value) : 0}
												onValueChange={(nextValue) => {
													sub.handleChange(
														nextValue === null ? '' : nextValue.toFixed(2),
													);
												}}
												onBlur={sub.handleBlur}
												placeholder="Cost"
												className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
											/>
											<FieldError errors={sub.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								<form.Field name={`items[${index}].discountPct`}>
									{(sub) => (
										<Field>
											<NumberInput
												value={sub.state.value ? Number(sub.state.value) : 0}
												onValueChange={(nextValue) => {
													sub.handleChange(
														nextValue === null ? '' : nextValue.toFixed(2),
													);
												}}
												onBlur={sub.handleBlur}
												placeholder="Disc %"
												className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
											/>
											<FieldError errors={sub.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								<Button
									type="button"
									onClick={() => field.removeValue(index)}
									disabled={field.state.value.length === 1}
									className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef] disabled:opacity-30"
								>
									<TrashIcon className="h-4 w-4" />
								</Button>
							</div>
						))}
						{field.state.meta.errors ? (
							<FieldError errors={field.state.meta.errors} />
						) : null}
					</div>
				)}
			</form.Field>
		</div>
	);
}

export function TranchesSection({ form }: { form: InvoiceFormApi }) {
	return (
		<form.Field name="paymentType">
			{(pTypeField) => (
				<div>
					<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
						PAYMENT TERMS
					</div>
					<div className="flex gap-2 mb-12">
						<Button
							type="button"
							variant={
								pTypeField.state.value !== 'tranche' ? 'default' : 'outline'
							}
							onClick={() => pTypeField.handleChange('full')}
							className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pTypeField.state.value !== 'tranche' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
						>
							Full payment
						</Button>
						<Button
							type="button"
							variant={
								pTypeField.state.value === 'tranche' ? 'default' : 'outline'
							}
							onClick={() => pTypeField.handleChange('tranche')}
							className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pTypeField.state.value === 'tranche' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
						>
							Tranches / milestones
						</Button>
					</div>
					{pTypeField.state.value !== 'tranche' ? (
						<div className="text-xs text-[#5c5755]">
							One payment, due on the due date above. Record what has been
							received on the invoice itself, under Payment status.
						</div>
					) : (
						<form.Field name="tranches" mode="array">
							{(field) => (
								<div>
									<div className="flex gap-2 mb-12">
										<Button
											type="button"
											onClick={() =>
												field.pushValue({
													name: `M${field.state.value.length + 1} — `,
													deliverables: '',
													dueDate:
														(form.getFieldValue('dueDate') as string) || '',
													amount: '0',
													paid: false,
													sortOrder: field.state.value.length,
												})
											}
											className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d] h-9"
										>
											Add tranche
										</Button>
										<Button
											type="button"
											onClick={() => {
												const items =
													(form.getFieldValue('items') as ItemValue[]) || [];
												const subtotal = items.reduce(
													(s: number, it: any) =>
														s + Number(it.qty || 0) * Number(it.cost || 0),
													0,
												);
												const n = field.state.value.length || 1;
												const each = Math.round((subtotal / n) * 100) / 100;
												const newTranches = field.state.value.map(
													(t: TrancheValue, i: number) => ({
														...t,
														amount:
															i === n - 1
																? (
																		Math.round(
																			(subtotal - each * (n - 1)) * 100,
																		) / 100
																	).toFixed(2)
																: each.toFixed(2),
													}),
												);
												field.handleChange(newTranches);
											}}
											className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d] h-9"
										>
											Split subtotal evenly
										</Button>
									</div>
									<div className="flex flex-col gap-0.5 bg-[#201e1d] border-2 border-[#201e1d] p-0.5">
										{(field.state.value || []).map((_, index) => (
											<div
												key={index}
												className="bg-white p-3 grid grid-cols-[1fr_1.8fr_1fr_1fr_auto] gap-2 items-end"
											>
												<form.Field name={`tranches[${index}].name`}>
													{(sub) => (
														<Field>
															<FieldLabel>Milestone</FieldLabel>
															<Input
																value={sub.state.value}
																onChange={(e) =>
																	sub.handleChange(e.target.value)
																}
																onBlur={sub.handleBlur}
																placeholder="M1 — Mobilisation"
																className="h-9 px-2.5 text-[13px]"
															/>
															<FieldError errors={sub.state.meta.errors} />
														</Field>
													)}
												</form.Field>
												<form.Field name={`tranches[${index}].deliverables`}>
													{(sub) => (
														<Field>
															<FieldLabel>Deliverables</FieldLabel>
															<Input
																value={sub.state.value || ''}
																onChange={(e) =>
																	sub.handleChange(e.target.value)
																}
																onBlur={sub.handleBlur}
																placeholder="SOW signature, PO"
																className="h-9 px-2.5 text-[13px]"
															/>
															<FieldError errors={sub.state.meta.errors} />
														</Field>
													)}
												</form.Field>
												<form.Field name={`tranches[${index}].dueDate`}>
													{(sub) => (
														<Field>
															<FieldLabel>Due date</FieldLabel>
															<Input
																type="date"
																value={sub.state.value || ''}
																onChange={(e) =>
																	sub.handleChange(e.target.value)
																}
																onBlur={sub.handleBlur}
																className="h-9 px-2.5 text-[13px]"
															/>
															<FieldError errors={sub.state.meta.errors} />
														</Field>
													)}
												</form.Field>
												<form.Field name={`tranches[${index}].amount`}>
													{(sub) => (
														<Field>
															<FieldLabel>Amount</FieldLabel>
															<Input
																type="text"
																inputMode="decimal"
																value={sub.state.value}
																onChange={(e) =>
																	sub.handleChange(e.target.value)
																}
																onBlur={sub.handleBlur}
																placeholder="0.00"
																className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
															/>
															<FieldError errors={sub.state.meta.errors} />
														</Field>
													)}
												</form.Field>
												<div className="flex gap-1 self-end">
													<form.Field name={`tranches[${index}].paid`}>
														{(paidField) => (
															<Button
																type="button"
																onClick={() =>
																	paidField.handleChange(!paidField.state.value)
																}
																className={`h-9 px-3 text-xs font-semibold rounded-none border-2 ${paidField.state.value ? 'bg-[#ec3013] text-white border-[#ec3013]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
															>
																{paidField.state.value ? 'Paid' : 'Unpaid'}
															</Button>
														)}
													</form.Field>
													<Button
														type="button"
														onClick={() => field.removeValue(index)}
														className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef]"
													>
														<TrashIcon className="h-4 w-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
									<TrancheSummary form={form} />
								</div>
							)}
						</form.Field>
					)}
				</div>
			)}
		</form.Field>
	);
}

function TrancheSummary({ form }: { form: InvoiceFormApi }) {
	return (
		<form.Subscribe
			selector={(s) =>
				[
					s.values.items,
					s.values.currency,
					s.values.taxName,
					s.values.taxRate,
					s.values.tranches,
				] as const
			}
		>
			{([items, currency, taxName, taxRate, tranches]) => {
				const subtotal = (items as ItemValue[]).reduce(
					(s: number, it: any) =>
						s + Number(it.qty || 0) * Number(it.cost || 0),
					0,
				);
				const rate = Number(taxRate || 0);
				const tax = subtotal * (rate / 100);
				const total = subtotal + tax;
				const trSum =
					(tranches as ItemValue[] | undefined)?.reduce(
						(s: number, t: TrancheValue) => s + Number(t.amount || 0),
						0,
					) ?? 0;
				const hasWarn =
					Math.abs(trSum - subtotal) > 0.5 &&
					(tranches as ItemValue[])?.length > 0;
				const fmt = (n: number) => {
					try {
						return new Intl.NumberFormat('en-NG', {
							style: 'currency',
							currency: (currency as string) || 'NGN',
							minimumFractionDigits: 2,
						}).format(n);
					} catch {
						return `${currency || 'NGN'} ${n.toFixed(2)}`;
					}
				};
				return (
					<div>
						{hasWarn && (
							<div className="mt-2 text-xs font-semibold text-[#c02a10]">
								Tranches total {fmt(trSum)} — subtotal is {fmt(subtotal)}
							</div>
						)}
						<div className="flex justify-end gap-6 mt-4 pt-3 border-t-2 border-[#201e1d] text-[13px]">
							<div>
								Subtotal{' '}
								<strong className="tabular-nums">{fmt(subtotal)}</strong>
							</div>
							<div>
								{(taxName as string) || 'VAT'} ({rate}%){' '}
								<strong className="tabular-nums">{fmt(tax)}</strong>
							</div>
							<div>
								Total <strong className="tabular-nums">{fmt(total)}</strong>
							</div>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}

export function PaymentDestinationSection({ form }: { form: InvoiceFormApi }) {
	return (
		<form.Field name="paymentMethod">
			{(pmField) => (
				<div>
					<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
						PAYMENT DESTINATION & MEMO
					</div>
					<div className="flex gap-2 mb-12">
						<Button
							type="button"
							variant={pmField.state.value === 'bank' ? 'default' : 'outline'}
							onClick={() => pmField.handleChange('bank')}
							className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pmField.state.value === 'bank' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
						>
							Bank account on the invoice
						</Button>
						<Button
							type="button"
							variant={pmField.state.value === 'link' ? 'default' : 'outline'}
							onClick={() => pmField.handleChange('link')}
							className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pmField.state.value === 'link' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
						>
							Payment link
						</Button>
					</div>

					{pmField.state.value === 'bank' ? (
						<form.Field name="bankId">
							{(bankField) => (
								<Field>
									<FieldLabel>Bank account on the invoice</FieldLabel>
									<BankSelect
										value={bankField.state.value || ''}
										onValueChange={bankField.handleChange}
									/>
									<FieldError errors={bankField.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					) : (
						<div className="grid gap-3">
							<div className="grid grid-cols-[2fr_1fr] gap-3">
								<form.Field name="payLink">
									{(field) => (
										<Field>
											<FieldLabel>Payment link</FieldLabel>
											<Input
												value={field.state.value || ''}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												placeholder="https://checkout.korapay.com/pay/..."
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								<form.Field name="payLinkLabel">
									{(field) => (
										<Field>
											<FieldLabel>Button label</FieldLabel>
											<Input
												value={field.state.value || ''}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												placeholder="Pay online"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>
							</div>
							<form.Field name="payLinkCurrency">
								{(field) => (
									<Field>
										<FieldLabel>Pay link currency — searchable</FieldLabel>
										<CurrencySelect
											value={field.state.value || ''}
											onValueChange={(v) => field.handleChange(v)}
											placeholder="Search currency..."
										/>
										<FieldError errors={field.state.meta.errors} />
									</Field>
								)}
							</form.Field>
						</div>
					)}
					<div className="mt-4">
						<form.Field name="memo">
							{(field) => (
								<Field>
									<FieldLabel>
										Editable note printed at the foot of the invoice
									</FieldLabel>
									<Textarea
										value={field.state.value || ''}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Withholding tax of 5% applies per clause 5.5 ..."
										rows={3}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					</div>
				</div>
			)}
		</form.Field>
	);
}

export function StatusSection({ form }: { form: InvoiceFormApi }) {
	const statusOptions = [
		{ value: 'draft', label: 'Draft' },
		{ value: 'sent', label: 'Sent' },
		{ value: 'paid', label: 'Paid' },
		{ value: 'part_paid', label: 'Partially paid' },
		{ value: 'overdue', label: 'Overdue' },
		{ value: 'voided', label: 'Voided' },
	] as const;

	return (
		<div>
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
				STATUS
			</div>
			<div className="grid gap-3">
				<form.Field name="status">
					{(field) => (
						<Field>
							<FieldLabel>Invoice status</FieldLabel>
							<Select
								value={field.state.value ?? 'draft'}
								onValueChange={(v) =>
									field.handleChange(v as typeof field.state.value)
								}
							>
								<SelectTrigger className="w-full h-9 border border-[#201e1d] bg-white rounded-none">
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent className="rounded-none border-[#201e1d]">
									<SelectGroup>
										{statusOptions.map((opt) => (
											<SelectItem
												key={opt.value}
												value={opt.value}
												className="text-[13px]"
											>
												{opt.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
							<p className="text-[11px] text-[#5c5755] mt-1">
								Changing status on edit is saved with the invoice. Paid is
								normally set by payments, but you can override here.
							</p>
						</Field>
					)}
				</form.Field>

				<form.Field name="status">
					{(statusField) =>
						statusField.state.value === 'voided' ? (
							<form.Field name="voidReason">
								{(field) => (
									<Field>
										<FieldLabel>Void reason</FieldLabel>
										<Textarea
											value={field.state.value ?? ''}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="Why voided — shown on record"
											rows={2}
											className="rounded-none border-[#201e1d] bg-white"
										/>
										<FieldError errors={field.state.meta.errors} />
									</Field>
								)}
							</form.Field>
						) : null
					}
				</form.Field>
			</div>
		</div>
	);
}

type BankSelectProps = {
	value?: string;
	onValueChange: (v: Currency) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
};

function BankSelect({
	value,
	onValueChange,
	placeholder,
	disabled,
	className,
}: BankSelectProps) {
	const { data: banksData, isLoading } = useBanks();

	if (isLoading) return <Skeleton className="h-9 w-full rounded-none" />;

	return (
		<Select
			value={value ?? ''}
			onValueChange={onValueChange}
			disabled={disabled}
		>
			<SelectTrigger
				className={cn(
					'w-full h-9 border border-[#201e1d] bg-white rounded-none',
					className,
				)}
			>
				<SelectValue placeholder={placeholder ?? 'Select bank account'} />
			</SelectTrigger>
			<SelectContent>
				{isLoading ? (
					<Skeleton className="h-9 w-full rounded-none" />
				) : (
					<SelectGroup>
						{banksData?.banks?.map(
							(b: {
								id: string;
								label: string;
								currency: string;
								fields: Array<[string, string]>;
							}) => (
								<SelectItem key={b.id} value={b.id}>
									<div className="grid">
										<span className="font-medium">{b.label}</span>
										<span className="text-xs text-[#5c5755]">
											{b.currency} •{' '}
											{b.fields
												.map(([k, v]: [string, string]) => `${k}: ${v}`)
												.join(' • ')}
										</span>
									</div>
								</SelectItem>
							),
						)}
					</SelectGroup>
				)}
			</SelectContent>
		</Select>
	);
}
