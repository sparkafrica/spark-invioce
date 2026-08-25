import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await authClient.signUp.email({ name, email, password })
      if (error) throw new Error(error.message || 'Registration failed')
      navigate({ to: '/auth/login' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d]">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
          <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={190} height={36} className="h-9 w-auto" />
          <div>
            <h1 className="max-w-[9em] text-[44px] font-bold leading-[1.02] tracking-[-0.03em]">Invoices, memos and money across the three businesses</h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">New Business · Africa Startup Festival · Africa Technology Expo. invoices.sparkmarkets.co</p>
          </div>
          <div className="text-[11px] tracking-[0.1em] text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">CREATE ACCOUNT</div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold">Name</label>
                <input id="name" name="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okonkwo" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sparkafrica.co" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
              </div>
              {error && <div className="text-xs font-semibold text-[#c02a10]" role="alert" aria-live="polite">{error}</div>}
              <button type="submit" disabled={isLoading} className="w-full bg-[#ec3013] px-3.5 py-3 text-left text-[13px] font-semibold text-white hover:bg-[#c02a10] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]">
                {isLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="text-xs text-[#5c5755]">Already have an account? <Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
