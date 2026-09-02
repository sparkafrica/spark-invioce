import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { requestPasswordReset } from '#/lib/server-fns/auth';

const forgotSchema = v.object({
  email: v.pipe(
    v.string(),
    v.minLength(1, 'Email is required'),
    v.email('Invalid email'),
  ),
});

export const Route = createFileRoute('/_auth/auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: { email: '' },
    validators: {
      onChange: ({ value }) =>
        standardSchemaValidators.validate(
          { value, validationSource: 'field' },
          forgotSchema,
        ),
      onSubmit: ({ value }) =>
        standardSchemaValidators.validate(
          { value, validationSource: 'form' },
          forgotSchema,
        ),
    },
    onSubmit: async ({ value }) => {
      const { error } = await requestPasswordReset({
        data: {
          email: value.email,
          redirectTo: '/auth/reset-password',
        }
      });
      if (error) throw new Error(error || 'Failed to send reset email');
      setSuccess(true);
    },
  });

  return (
    <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d]">
      <div className="min-h-screen grid lg:grid-cols-2">
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
              Invoices, memos and money across the three businesses
            </h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">
              New Business · Africa Startup Festival · Africa Technology Expo.
            </p>
          </div>
          <div className="text-[11px] tracking-widest text-[#5c5755]">
            SPARK — NIGERIA · UNITED KINGDOM
          </div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-90 mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">
              FORGOT PASSWORD
            </div>
            <h2 className="text-[11px] font-semibold text-[#201e1d]">
              Enter your email and we&apos;ll send you a link to reset your
              password
            </h2>
            {success && (
              // biome-ignore lint/a11y/useSemanticElements: This is a status message, not a heading
              <div
                className="border border-[#201e1d] bg-[#f0dcd8] p-3 text-xs font-semibold"
                role="status"
                aria-live="polite"
              >
                If an account exists for that email, a password reset link has
                been sent.
              </div>
            )}
            {!success && (
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

                <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="w-full bg-[#ec3013] text-white hover:bg-[#c02a10] rounded-none h-11 text-[13px] font-semibold"
                    >
                      {isSubmitting ? 'Sending…' : 'Send reset link'}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            )}
            <p className="border-t border-[#d6d3d1] pt-3 text-xs text-[#5c5755]">
              Remember your password?{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
