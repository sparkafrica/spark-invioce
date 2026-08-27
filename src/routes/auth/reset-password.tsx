import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

const resetSchema = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(5, 'Password must be at least 5 characters')),
    confirmPassword: v.pipe(v.string(), v.minLength(1, 'Confirm password')),
  }),
  v.forward(
    v.check((input) => input.password === input.confirmPassword, 'Passwords do not match'),
    ['confirmPassword']
  )
)

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search) => ({ token: search.token }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = useSearch({ from: '/auth/reset-password' })
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, resetSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, resetSchema),
    },
    onSubmit: async ({ value }) => {
      const tokenValue = token as string | undefined
      if (!tokenValue) throw new Error('Invalid or missing reset token')
      const { error } = await authClient.resetPassword({ newPassword: value.password, token: tokenValue })
      if (error) throw new Error(error.message || 'Failed to reset password')
      setSuccess(true)
    },
  })

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d] flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] border-2 border-[#201e1d] bg-white p-6">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">INVALID LINK</div>
          <h1 className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">Invalid link</h1>
          <p className="mt-2 text-xs leading-5 text-[#5c5755]">This password reset link is invalid or has expired.</p>
          <Link to="/auth/forgot-password" className="mt-4 inline-block border border-[#201e1d] px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8]">Request a new reset link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d]">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
          <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={190} height={36} className="h-9 w-auto" />
          <div>
            <h1 className="max-w-[9em] text-[19px] font-semibold leading-[1.02] tracking-[-0.03em]">Invoices, memos and money across the three businesses</h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">New Business · Africa Startup Festival · Africa Technology Expo.</p>
          </div>
          <div className="text-[11px] tracking-[0.1em] text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">RESET PASSWORD</div>
            <h2 className="text-xs font-semibold">Enter your new password</h2>
            {success && <div className="border border-[#201e1d] bg-[#f0dcd8] p-3 text-xs font-semibold" role="status">Your password has been reset successfully.</div>}
            {!success && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
                className="flex flex-col gap-4"
              >
                <form.Field name="password">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                      <Input id={field.name} name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="••••••••" />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="confirmPassword">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>
                      <Input id={field.name} name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="••••••••" />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full bg-[#ec3013] text-white hover:bg-[#c02a10] rounded-none h-11 text-[13px] font-semibold">
                      {isSubmitting ? 'Resetting…' : 'Reset password'}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            )}
            <p className="border-t border-[#d6d3d1] pt-3 text-xs text-[#5c5755]"><Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Back to sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
