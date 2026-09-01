'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import { createMemo, updateMemo } from '#/lib/server-fns/memos';
import { getBusinesses, getCompanies } from '#/lib/server-fns/references';

const memoSchema = v.object({
	number: v.pipe(v.string(), v.minLength(1, 'Memo number is required')),
	date: v.pipe(v.string(), v.minLength(1, 'Date is required')),
	businessId: v.pipe(v.string(), v.minLength(1, 'Business is required')),
	companyId: v.pipe(v.string(), v.minLength(1, 'Company is required')),
	to: v.pipe(v.string(), v.minLength(1, 'To is required')),
	from: v.pipe(v.string(), v.minLength(1, 'From is required')),
	subject: v.pipe(v.string(), v.minLength(1, 'Subject is required')),
	body: v.pipe(v.string(), v.minLength(1, 'Body is required')),
});

type MemoFormValues = v.InferOutput<typeof memoSchema>;

interface MemoFormProps {
	initialData?: Partial<MemoFormValues>;
	isEditing?: boolean;
	memoId?: string;
	onCancel?: () => void;
	onSuccess?: () => void;
}

export function MemoForm({
	initialData,
	isEditing = false,
	memoId,
	onCancel,
	onSuccess,
}: MemoFormProps) {
	const form = useForm({
		defaultValues: {
			number: '',
			date: new Date().toISOString().slice(0, 10),
			businessId: '',
			companyId: '',
			to: '',
			from: '',
			subject: '',
			body: '',
			...initialData,
		},
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					memoSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					memoSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				if (isEditing && memoId) {
					await updateMemo({ data: { ...value, id: memoId } });
					toast.add({ title: 'Memo updated successfully', type: 'success' });
				} else {
					await createMemo({ data: value });
					toast.add({ title: 'Memo created successfully', type: 'success' });
				}
				onSuccess?.();
			} catch (error) {
				toast.add({ description: (error as Error).message, type: 'error' });
			}
		},
	});

	const { data: businessesData } = useQuery({
		queryKey: ['businesses'],
		queryFn: () => getBusinesses({ data: {} }),
	});

	const { data: companiesData } = useQuery({
		queryKey: ['companies'],
		queryFn: () => getCompanies({ data: {} }),
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		form.handleSubmit();
	};

	const businesses = businessesData?.businesses || [];
	const companies = companiesData?.companies || [];

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto max-w-[860px] flex flex-col gap-6 py-6"
			style={{ padding: '28px 24px 56px' }}
		>
			<div className="flex items-end gap-4 border-b-2 border-[#201e1d] pb-3">
				<h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none">
					{isEditing ? 'Edit Memo' : 'New Memo'}
				</h1>
				<div className="flex gap-4 ml-auto">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
					>
						Cancel
					</Button>
					<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
						{([canSubmit, isSubmitting]) => (
							<Button
								type="submit"
								variant="default"
								disabled={!canSubmit || isSubmitting}
								className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
							>
								{isSubmitting
									? 'Saving…'
									: isEditing
										? 'Save changes'
										: 'Create memo'}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</div>

			<div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4">
				<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
					MEMO — {isEditing ? 'EDIT' : 'NEW'}
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<form.Field name="number">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Memo number</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="MEMO-2026-001"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<form.Field name="date">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Date</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="date"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<form.Field name="businessId">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Business</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select business" />
									</SelectTrigger>
									<SelectContent>
										{businesses.map((b: any) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					<form.Field name="to">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>To</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="B4B Partners Limited — Chinapa Onwusah"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
					<form.Field name="from">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>From</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Nnaemeka Clinton, CEO"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="companyId">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								Invoicing company on the letterhead
							</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v ?? '')}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select company" />
								</SelectTrigger>
								<SelectContent>
									{companies.map((c: any) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name} ({c.region})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				<form.Field name="subject">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Subject</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Payment schedule and milestone acceptance"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				<form.Field name="body">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								Body — one paragraph per line
							</FieldLabel>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value || ''}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								rows={14}
								placeholder="This memo accompanies invoice SPK-2026-0812.\n\nThe fee of N25,500,000.00 excluding VAT is payable across four milestones..."
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>
		</form>
	);
}
