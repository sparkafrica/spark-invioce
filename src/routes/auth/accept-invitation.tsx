'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Skeleton } from '#/components/ui/skeleton';
import { toast } from '#/components/ui/toast';
import { getErrorMessage } from '#/lib/errors';
import {
  acceptInvitationAndCreateUser,
  getInvitationMeta,
} from '#/lib/server-fns/accept-invitation';

const acceptInvitationSchema = v.pipe(
  v.object({
    name: v.optional(v.string()),
    email: v.pipe(v.string(), v.minLength(1, 'Email is required'), v.email('Invalid email')),
    password: v.pipe(v.string(), v.minLength(5, 'Password must be at least 5 characters')),
    confirmPassword: v.pipe(v.string(), v.minLength(1, 'Confirm password')),
  }),
  v.forward(
    v.check((input) => input.password === input.confirmPassword, 'Passwords do not match'),
    ['confirmPassword'],
  ),
);

type AcceptInvitationFormValues = v.InferOutput<typeof acceptInvitationSchema>;

export const Route = createFileRoute('/auth/accept-invitation')({
  validateSearch: v.object({
    token: v.pipe(v.string(), v.minLength(1)),
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();

  const metaQuery = useQuery({
    queryKey: ['invitation-meta', token],
    queryFn: () => getInvitationMeta({ data: { invitationId: token } }),
    retry: false,
  });

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    } satisfies AcceptInvitationFormValues,
    validators: {
      onChange: ({ value }) =>
        standardSchemaValidators.validate({ value, validationSource: 'field' }, acceptInvitationSchema),
      onSubmit: ({ value }) =>
        standardSchemaValidators.validate({ value, validationSource: 'form' }, acceptInvitationSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        await acceptInvitationAndCreateUser({
          data: {
            invitationId: token,
            email: value.email,
            password: value.password,
            name: value.name || undefined,
          },
        });
        toast.add({ title: 'Invitation accepted', type: 'success' });
        await navigate({ to: '/dashboard' });
      } catch (e: unknown) {
        const msg = getErrorMessage(e, 'Failed to accept invitation');
        const friendly =
          msg === 'INVITATION_INVALID'
            ? 'This invitation is invalid.'
            : msg === 'INVITATION_EXPIRED'
              ? 'This invitation has expired.'
              : msg === 'EMAIL_MISMATCH'
                ? 'Email does not match the invitation.'
                : msg;
        toast.add({ description: friendly, type: 'error' });
      }
    },
  });

  const metaEmail = metaQuery.data?.email;
  useEffect(() => {
    if (metaEmail && !form.getFieldValue('email')) {
      form.setFieldValue('email', metaEmail);
    }
  }, [metaEmail, form]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  if (metaQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f2f2] flex items-center justify-center p-6">
        <Skeleton className="h-32 w-80 rounded-none" />
      </div>
    );
  }

  if (metaQuery.isError) {
    const msg = getErrorMessage(metaQuery.error, 'Invalid invitation');
    const friendly =
      msg === 'INVITATION_EXPIRED' ? 'This invitation has expired.' : 'This invitation is invalid or has already been accepted.';
    return (
      <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d] grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Invitation unavailable</h1>
          <p className="text-sm text-muted-foreground">{friendly}</p>
          <Link to="/auth/login" className="text-sm font-semibold text-[#c02a10] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d]">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
          <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={190} height={36} className="h-9 w-auto" />
          <div>
            <h1 className="max-w-[9em] text-[32px] font-medium leading-[1.02] tracking-[-0.03em]">Accept your invitation to Spark</h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">Join the team and start managing invoices, memos and money across the three businesses.</p>
          </div>
          <div className="text-[11px] tracking-widest text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-90 mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">ACCEPT INVITATION</div>
            {metaEmail && <p className="text-xs text-muted-foreground">Invitation for <span className="font-semibold text-foreground">{metaEmail}</span></p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Name (optional)</FieldLabel>
                    <Input id={field.name} name={field.name} type="text" autoComplete="name" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Ada Okonkwo" />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input id={field.name} name={field.name} type="email" autoComplete="email" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="you@sparkafrica.co" />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input id={field.name} name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="••••••••" />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="confirmPassword">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                    <Input id={field.name} name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="••••••••" />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full bg-[#ec3013] text-white hover:bg-[#c02a10] rounded-none h-11 text-[13px] font-semibold">
                    {isSubmitting ? 'Accepting…' : 'Accept invitation'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
            <p className="text-xs text-[#5c5755]">
              Already have an account? <Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
