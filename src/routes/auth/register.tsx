import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { authClient } from '#/lib/auth-client'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

const registerSchema = v.pipe(
  v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    email: v.pipe(v.string(), v.minLength(1, 'Email is required'), v.email('Invalid email')),
    password: v.pipe(v.string(), v.minLength(5, 'Password must be at least 5 characters')),
    confirmPassword: v.pipe(v.string(), v.minLength(1, 'Confirm password')),
  }),
  v.forward(
    v.check((input) => input.password === input.confirmPassword, 'Passwords do not match'),
    ['confirmPassword']
  )
)

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, registerSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, registerSchema),
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email({ name: value.name, email: value.email, password: value.password })
      if (error) throw new Error(error.message || 'Registration failed')
      navigate({ to: '/auth/login' })
    },
  })

  return (
    <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d]">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
          <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={190} height={36} className="h-9 w-auto" />
          <div>
            <h1 className="max-w-[9em] text-[19px] font-semibold leading-[1.02] tracking-[-0.03em]">Invoices, memos and money across the three businesses</h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">New Business · Africa Startup Festival · Africa Technology Expo. invoices.sparkmarkets.co</p>
          </div>
          <div className="text-[11px] tracking-[0.1em] text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">CREATE ACCOUNT</div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex flex-col gap-4"
            >
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input id={field.name} name={field.name} type="text" autoComplete="name" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Ada Okonkwo" />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input id={field.name} name={field.name} type="email" autoComplete="email" spellCheck={false} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="you@sparkafrica.co" />
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
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
            <p className="text-xs text-[#5c5755]">Already have an account? <Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
