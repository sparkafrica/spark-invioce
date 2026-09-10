// --- Validation & Form Imports ---
import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { formatDate } from 'date-fns';
import { useState } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
// --- Shadcn UI Imports ---
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import { authClient } from '#/lib/auth-client';
import { inviteMember, listUsers } from '#/lib/server-fns/team';
import type { user } from '#/db/auth-schema';

export const Route = createFileRoute('/_auth-layout/team')({
	component: TeamPage,
});

const inviteSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	email: v.pipe(v.string(), v.email('Please enter a valid email address')),
	role: v.picklist(['member', 'admin'], 'Please select a valid role'),
});

type InviteFormValues = v.InferOutput<typeof inviteSchema>;
type UserRow = typeof user.$inferSelect;

function TeamPage() {
	const { data: session, isPending } = authClient.useSession();
	const qc = useQueryClient();
	const role = (session?.user as unknown as { role?: string | null })?.role;
	const isAdmin = role === 'owner' || role === 'admin';

	const [msg, setMsg] = useState('');

	const { data: membersData, isLoading } = useQuery({
		queryKey: ['users'],
		queryFn: () => listUsers(),
	});

	// 2. Initialize TanStack Form
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			role: 'member' as const,
		} as InviteFormValues,
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					inviteSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					inviteSchema,
				),
		},
		onSubmit: async ({ value }) => {
			try {
				setMsg('');
				const res = await inviteMember({
					data: {
						email: value.email,
						role: value.role,
						name: value.name,
					},
				});

				if (!res.success) throw new Error(res.error || res.message);

				const pwd = (res as unknown as { tempPassword?: string }).tempPassword;
				setMsg(
					pwd
						? `User created for ${value.email} — temp password emailed`
						: `User created for ${value.email}`,
				);
				form.reset();
				qc.invalidateQueries({ queryKey: ['users'] });
			} catch (e: unknown) {
				const msg =
					typeof e === 'object' && e !== null && 'message' in e
						? (e as { message?: unknown }).message
						: undefined;

				setMsg(typeof msg === 'string' ? msg : 'Failed to create user');
			}
		},
	});

	if (isLoading || isPending) {
		return (
			<div className="grid lg:grid-cols-[1.4fr_1fr] gap-9 items-start">
				<div>
					<div className="border-b-2 border-[#201e1d] pb-3.5 mb-5 text-[32px] font-medium tracking-[-0.02em] leading-none">
						Team
					</div>
					<div className="rounded-none border-2 border-[#201e1d] bg-white p-4 space-y-3">
						<Skeleton className="h-6 w-full rounded-none" />
						<Skeleton className="h-6 w-full rounded-none" />
						<Skeleton className="h-6 w-full rounded-none" />
						<Skeleton className="h-6 w-3/4 rounded-none" />
					</div>
				</div>
				<div className="border-l-2 border-[#201e1d] pl-7">
					<div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
						INVITE A TEAM MEMBER
					</div>
					<div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
						<Skeleton className="h-9 w-full rounded-none" />
						<Skeleton className="h-9 w-full rounded-none" />
						<Skeleton className="h-9 w-full rounded-none" />
						<Skeleton className="h-10 w-full rounded-none" />
					</div>
				</div>
			</div>
		);
	}

	const teamRows = (membersData?.users ?? []) as unknown as UserRow[];

	return (
		<div className="grid lg:grid-cols-[1.4fr_1fr] gap-9 items-start">
			{/* Table Section */}
			<div>
				<div className="border-b-2 border-[#201e1d] pb-3.5 mb-5 text-[32px] font-medium tracking-[-0.02em] leading-none">
					Team
				</div>

				<Table className="bg-white">
					<TableHeader>
						<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
							<TableHead className="text-left py-2.5 px-3 text-[10px] tracking-widest font-semibold text-black h-auto">
								NAME
							</TableHead>
							<TableHead className="text-left py-2.5 px-3 text-[10px] tracking-widest font-semibold text-black h-auto">
								EMAIL
							</TableHead>
							<TableHead className="text-left py-2.5 px-3 text-[10px] tracking-widest font-semibold text-black h-auto">
								ROLE
							</TableHead>
							<TableHead className="text-left py-2.5 px-3 text-[10px] tracking-widest font-semibold text-black h-auto">
								CREATED AT
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamRows.map((u) => (
							<TableRow
								key={u.email}
								className="border-b border-[#d6d3d1] hover:bg-black/5"
							>
								<TableCell className="py-3 px-3 text-[13px] font-semibold">
									{u.name}
								</TableCell>
								<TableCell className="py-3 px-3 text-[13px]">
									{u.email}
								</TableCell>
								<TableCell className="py-3 px-3 text-[13px] capitalize">
									{u.role === 'member' ? 'Editor' : (u.role ?? 'member')}
								</TableCell>
								<TableCell className="py-3 px-3 text-[13px] text-[#5c5755]">
									{u.createdAt
										? formatDate(new Date(u.createdAt), 'dd MMM yyyy, KK:mm:ss a')
										: '—'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Form Section */}
			<div className="border-l-2 border-[#201e1d] pl-7">
				<div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
					INVITE A TEAM MEMBER
				</div>

				{isPending ? (
					<Skeleton className="h-8 w-24 rounded-none" />
				) : isAdmin ? (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="flex flex-col gap-4"
					>
						{/* Name Field */}
						<form.Field name="name">
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label
										htmlFor={field.name}
										className="text-[11px] font-semibold"
									>
										Name
									</Label>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Ada Okonkwo"
										className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus-visible:ring-1 focus-visible:ring-[#201e1d]"
									/>
									{field.state.meta.errors ? (
										<p className="text-[10px] text-[#ec3013]">
											{field.state.meta.errors.join(', ')}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						{/* Email Field */}
						<form.Field name="email">
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label
										htmlFor={field.name}
										className="text-[11px] font-semibold"
									>
										Email
									</Label>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="ada@sparkafrica.co"
										className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus-visible:ring-1 focus-visible:ring-[#201e1d]"
									/>
									{field.state.meta.errors ? (
										<p className="text-[10px] text-[#ec3013]">
											{field.state.meta.errors.join(', ')}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						{/* Role Field */}
						<form.Field name="role">
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label
										htmlFor={field.name}
										className="text-[11px] font-semibold"
									>
										Role
									</Label>
									<Select
										value={field.state.value}
										onValueChange={(val) =>
											field.handleChange(val as 'member' | 'admin')
										}
									>
										<SelectTrigger className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus:ring-1 focus:ring-[#201e1d]">
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent className="rounded-none border-[#201e1d]">
											<SelectItem value="member" className="text-[13px]">
												Editor
											</SelectItem>
											<SelectItem value="admin" className="text-[13px]">
												Admin
											</SelectItem>
										</SelectContent>
									</Select>
									{field.state.meta.errors ? (
										<p className="text-[10px] text-[#ec3013]">
											{field.state.meta.errors.join(', ')}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						{/* Submit Button & Messages */}
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									disabled={!canSubmit || isSubmitting}
									className="rounded-none bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-4 text-xs font-semibold hover:bg-[#c02a10] w-full justify-start mt-2"
								>
									{isSubmitting ? 'Creating...' : 'Create user'}
								</Button>
							)}
						</form.Subscribe>

						{msg && (
							<div className="text-xs text-[#5c5755] border border-[#d6d3d1] p-2 bg-[#f3f2f2]">
								{msg}
							</div>
						)}
					</form>
				) : (
					<div className="text-xs text-[#5c5755]">
						Only admins can invite people or change roles.
					</div>
				)}
			</div>
		</div>
	);
}
