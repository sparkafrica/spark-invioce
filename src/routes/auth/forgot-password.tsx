import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/auth/reset-password' })
      if (error) throw new Error(error.message || 'Failed to send reset email')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
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
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">New Business · Africa Startup Festival · Africa Technology Expo.</p>
          </div>
          <div className="text-[11px] tracking-[0.1em] text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">FORGOT PASSWORD</div>
            <h2 className="text-[11px] font-semibold text-[#201e1d]">Enter your email and we&apos;ll send you a link to reset your password</h2>
            {error && <div className="text-xs font-semibold text-[#c02a10]" role="alert" aria-live="polite">{error}</div>}
            {success && <div className="border border-[#201e1d] bg-[#f0dcd8] p-3 text-xs font-semibold" role="status" aria-live="polite">If an account exists for that email, a password reset link has been sent.</div>}
            {!success && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sparkafrica.co" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#ec3013] px-3.5 py-3 text-left text-[13px] font-semibold text-white hover:bg-[#c02a10] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]">
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
            <p className="border-t border-[#d6d3d1] pt-3 text-xs text-[#5c5755]">Remember your password? <Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
