'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Skeleton } from '#/components/ui/skeleton';
import { toast } from '#/components/ui/toast';
import { authClient } from '#/lib/auth-client';

const profileSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	title: v.optional(v.string()),
});

export function ProfilePanel() {
	const { data: session, isPending } = authClient.useSession();
	const qc = useQueryClient();

	const form = useForm({
		defaultValues: {
			name: (session?.user?.name as string) ?? '',
			title:
				((session?.user as unknown as { title?: string })?.title as string) ??
				'',
		},
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					profileSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					profileSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				// Real mutation: better-auth updateUser (replaces stub `async (data)=>data`)
				const res = (await (
					authClient.updateUser as unknown as (
						d: Record<string, unknown>,
					) => Promise<{ error?: { message?: string } }>
				)({
					name: value.name,
					// additionalFields `title` declared in auth.ts user config
					title: value.title,
					// `image` supported by better-auth; keep undefined if not edited
					image:
						(session?.user as unknown as { image?: string })?.image ??
						undefined,
				} as unknown as never)) as { error?: { message?: string } };
				if (res?.error) throw new Error(res.error.message ?? 'Update failed');
				await qc.invalidateQueries({ queryKey: ['session'] });
				await qc.invalidateQueries({ queryKey: ['org-members'] });
				await qc.invalidateQueries({ queryKey: ['organization'] });
				toast.add({ title: 'Profile updated', type: 'success' });
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : 'Failed to update profile';
				toast.add({ description: msg, type: 'error' });
			}
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: stale sync: session arrives async, so reinitialize
	useEffect(() => {
		if (session?.user) {
			form.setFieldValue('name', session.user.name ?? '');
			const t = (session.user as unknown as { title?: string }).title ?? '';
			form.setFieldValue('title', t);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		session?.user?.name,
		(session?.user as unknown as { title?: string })?.title,
	]);

	if (isPending) return <ProfilePanelSkeleton />;

	return (
		<div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px]">
			<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
				PROFILE
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				<div className="grid gap-3 md:grid-cols-2">
					<form.Field name="name">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Ada Okonkwo"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<form.Field name="title">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Title</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value ?? ''}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Finance"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<Field>
						<FieldLabel>Email</FieldLabel>
						<Input
							value={session?.user?.email ?? ''}
							disabled
							className="bg-[#f3f2f2]"
						/>
					</Field>
				</div>

				<div className="mt-4 flex justify-end">
					<form.Subscribe
						selector={(s) => [s.canSubmit, s.isSubmitting] as const}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								type="submit"
								disabled={!canSubmit || isSubmitting}
								className="bg-[#ec3013] text-white border border-[#ec3013] hover:bg-[#c02a10] rounded-none px-4 py-2 text-xs font-semibold disabled:opacity-50"
							>
								{isSubmitting ? 'Saving…' : 'Save Changes'}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	);
}

export function ProfilePanelSkeleton() {
	return (
		<div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px] space-y-3">
			<Skeleton className="h-3 w-20 rounded-none" />
			<div className="grid gap-3 md:grid-cols-2">
				<Skeleton className="h-10 w-full rounded-none" />
				<Skeleton className="h-10 w-full rounded-none" />
				<Skeleton className="h-10 w-full rounded-none" />
			</div>
		</div>
	);
}
