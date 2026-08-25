import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search) => ({ token: search.token }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = useSearch({ from: '/auth/reset-password' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    const tokenValue = token as string | undefined
    if (!tokenValue) { setError('Invalid or missing reset token'); return }
    setIsLoading(true)
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token: tokenValue })
      if (error) throw new Error(error.message || 'Failed to reset password')
      setSuccess(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reset password') }
    finally { setIsLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f3f2f2] text-[#201e1d] flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] border-2 border-[#201e1d] bg-white p-6">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">INVALID LINK</div>
          <h1 className="mt-2 text-xl font-bold">Invalid link</h1>
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
            <h1 className="max-w-[9em] text-[44px] font-bold leading-[1.02] tracking-[-0.03em]">Invoices, memos and money across the three businesses</h1>
            <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">New Business · Africa Startup Festival · Africa Technology Expo.</p>
          </div>
          <div className="text-[11px] tracking-[0.1em] text-[#5c5755]">SPARK — NIGERIA · UNITED KINGDOM</div>
        </div>
        <div className="flex items-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">RESET PASSWORD</div>
            <h2 className="text-xs font-semibold">Enter your new password</h2>
            {error && <div className="text-xs font-semibold text-[#c02a10]" role="alert" aria-live="polite">{error}</div>}
            {success && <div className="border border-[#201e1d] bg-[#f0dcd8] p-3 text-xs font-semibold" role="status">Your password has been reset successfully.</div>}
            {!success && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-xs font-semibold">New password</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm new password</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#ec3013] px-3.5 py-3 text-left text-[13px] font-semibold text-white hover:bg-[#c02a10] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]">
                  {isLoading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            )}
            <p className="border-t border-[#d6d3d1] pt-3 text-xs text-[#5c5755]"><Link to="/auth/login" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">Back to sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
