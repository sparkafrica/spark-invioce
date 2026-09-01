'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { CurrencySelect } from '#/components/ui/currency-select';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { NumberInput } from '#/components/ui/number-input';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import { createProduct, updateProduct } from '#/lib/server-fns/crm';

const productSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	description: v.optional(v.string()),
	cost: v.pipe(v.string(), v.regex(/^\d+(\.\d+)?$/, 'Cost must be a number')),
	currency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
});

type ProductFormValues = v.InferOutput<typeof productSchema>;

interface ProductFormProps {
	isEditing?: boolean;
	initialData?: Partial<ProductFormValues>;
	productId?: string;
	onCancel?: () => void;
	onSuccess?: () => void;
}

export function ProductForm({
	initialData,
	isEditing = false,
	productId,
	onCancel,
	onSuccess,
}: ProductFormProps) {
	const form = useForm({
		defaultValues: {
			name: '',
			description: '',
			cost: '',
			currency: 'NGN',
			...initialData,
		},
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					productSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					productSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				if (isEditing && productId) {
					await updateProduct({ data: { ...value, id: productId } });
					toast.add({ title: 'Product updated successfully', type: 'success' });
				} else {
					await createProduct({ data: value });
					toast.add({ title: 'Product created successfully', type: 'success' });
				}
				onSuccess?.();
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
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-6"
		>
			<form.Field name="name">
				{(field) => (
					<Field className="w-full">
						<FieldLabel htmlFor={field.name}>Name *</FieldLabel>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Professional Consulting Services"
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			<form.Field name="currency">
				{(field) => (
					<Field>
						<FieldLabel htmlFor={field.name}>Currency *</FieldLabel>
						<CurrencySelect
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value)}
							placeholder="Select currency"
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			<form.Field name="cost">
				{(field) => (
					<Field>
						<FieldLabel htmlFor={field.name}>Cost *</FieldLabel>
						<NumberInput
							id={field.name}
							name={field.name}
							value={field.state.value ? Number(field.state.value) : 0}
							onBlur={field.handleBlur}
							onValueChange={(nextValue) => {
								field.handleChange(
									nextValue === null ? '' : nextValue.toFixed(2),
								);
							}}
							placeholder="50,000.00"
							className="h-9 px-2.5 text-[13px] text-right"
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<Field>
						<FieldLabel htmlFor={field.name}>Description</FieldLabel>
						<Textarea
							id={field.name}
							name={field.name}
							value={field.state.value || ''}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Hourly consulting, workshop, etc."
							rows={3}
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			<div className="flex gap-2 pt-2">
				{isEditing && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
					>
						Cancel
					</Button>
				)}
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
									: 'Create product'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
