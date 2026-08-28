import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { standardSchemaValidators } from '@tanstack/react-form';
import * as v from 'valibot';
import { authClient } from '#/lib/auth-client';
import { Field, FieldLabel, FieldError } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Button } from '#/components/ui/button';
import { toast } from '#/components/ui/toast';

const loginSchema = v.object({
	email: v.pipe(
		v.string(),
		v.minLength(1, 'Email is required'),
		v.email('Invalid email'),
	),
	password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
});

export const Route = createFileRoute('/auth/login')({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: {
			onChange: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'field' },
					loginSchema,
				),
			onSubmit: ({ value }) =>
				standardSchemaValidators.validate(
					{ value, validationSource: 'form' },
					loginSchema,
				),
		},
		onSubmit: async ({ value }) => {
			const { error } = await authClient.signIn.email({
				email: value.email,
				password: value.password,
				fetchOptions: { onSuccess: () => navigate({ to: '/dashboard' }) },
			});
			if (error)
				toast.add({
					description: error?.message ?? 'Login failed',
					type: 'error',
				});
		},
	});

	return (
		<div className="bg-[#f3f2f2] text-[#201e1d] flex-1 grid lg:grid-cols-2">
			<div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
				<img
					src="/assets/spark-logo.png"
					alt="Spark Africa Technologies"
					width={190}
					height={36}
					className="h-9 w-min"
				/>
				<div>
					<h1 className="max-w-[9em] text-[32px] font-medium leading-[1.02] tracking-[-0.03em]">
						Invoicing for The Spark Africa Technologies
					</h1>
					<p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">
						Milestone invoices, tranche schedules and a full edit trail.
						invoices.sparkmarkets.co
					</p>
				</div>
				<div className="text-[11px] tracking-widest text-[#5c5755]">
					TIN 31067651-0001 · SPARK — NIGERIA · UNITED KINGDOM
				</div>
			</div>
			<div className="flex items-center px-6 py-12 lg:px-14">
				<div className="w-full max-w-90 mx-auto flex flex-col gap-4">
					<div className="lg:hidden mb-2 flex justify-center">
						<img
							src="/assets/spark-logo.png"
							alt="Spark"
							width={150}
							height={28}
							className="h-7 w-min"
						/>
					</div>
					<div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">
						SIGN IN
					</div>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
						className="flex flex-col gap-4"
					>
						<form.Field name="email">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>Email</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										autoComplete="email"
										spellCheck={false}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="you@sparkafrica.co"
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="password">
							{(field) => (
								<Field>
									<div className="flex items-center justify-between">
										<FieldLabel htmlFor={field.name}>Password</FieldLabel>
										<Link
											to="/auth/forgot-password"
											className="text-xs font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline"
										>
											Forgot password?
										</Link>
									</div>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										autoComplete="current-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="••••••••"
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									disabled={!canSubmit || isSubmitting}
									className="w-full bg-[#ec3013] text-white hover:bg-[#c02a10] rounded-none h-11 text-[13px] font-semibold"
								>
									{isSubmitting ? 'Signing in…' : 'Sign in'}
								</Button>
							)}
						</form.Subscribe>

						<Link
							to="/auth/forgot-password"
							className="w-full border border-[#201e1d] bg-transparent px-3.5 py-3 text-left text-xs font-semibold hover:bg-[#f0dcd8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]"
						>
							Forgot password — reset it
						</Link>
					</form>
					{/*<div className="border-t border-[#d6d3d1] pt-3 text-xs leading-5 text-[#5c5755]">
            Demo accounts — <strong className="font-semibold text-[#201e1d]">clinton@sparkafrica.co</strong> (admin) or <strong className="font-semibold text-[#201e1d]">ada@sparkafrica.co</strong> (editor). Any password.
          </div>*/}
					<p className="text-xs text-[#5c5755]">
						Don&apos;t have an account?{' '}
						<Link
							to="/auth/register"
							className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline"
						>
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
