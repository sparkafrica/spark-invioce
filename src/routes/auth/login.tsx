import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { error } = await authClient.signIn.email({
        email, password, fetchOptions: {
          onSuccess: () => {
            navigate({ to: '/dashboard' })
          }
        }
      })
      if (error) throw new Error(error.message || 'Login failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-[#f3f2f2] text-[#201e1d] flex-1 grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between border-r-2 border-[#201e1d] px-14 py-16">
        <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={190} height={36} className="h-9 w-min" />
        <div>
          <h1 className="max-w-[9em] text-[44px] font-bold leading-[1.02] tracking-[-0.03em]">Invoicing for The Spark Africa Technologies</h1>
          <p className="mt-5 max-w-[34em] text-sm leading-6 text-[#5c5755]">Milestone invoices, tranche schedules and a full edit trail. invoices.sparkmarkets.co</p>
        </div>
        <div className="text-[11px] tracking-widest text-[#5c5755]">TIN 31067651-0001 · SPARK — NIGERIA · UNITED KINGDOM</div>
      </div>
      <div className="flex items-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-90 mx-auto flex flex-col gap-4">
          <div className="lg:hidden mb-2 flex justify-center">
            <img src="/assets/spark-logo.png" alt="Spark" width={150} height={28} className="h-7 w-min" />
          </div>
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#c02a10]">SIGN IN</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@sparkafrica.co"
                disabled={isLoading}
                className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013] focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold">Password</label>
                <Link to="/auth/forgot-password" className="text-xs font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]"
              />
            </div>
            {error && <div className="text-xs font-semibold text-[#c02a10]" role="alert" aria-live="polite">{error}</div>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ec3013] px-3.5 py-3 text-left text-[13px] font-semibold text-white hover:bg-[#c02a10] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013] focus-visible:ring-offset-2"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
            <Link to="/auth/forgot-password" className="w-full border border-[#201e1d] bg-transparent px-3.5 py-2.75 text-left text-xs font-semibold hover:bg-[#f0dcd8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec3013]">Forgot password — reset it</Link>
          </form>
          <div className="border-t border-[#d6d3d1] pt-3 text-xs leading-5 text-[#5c5755]">
            Demo accounts — <strong className="font-semibold text-[#201e1d]">clinton@sparkafrica.co</strong> (admin) or <strong className="font-semibold text-[#201e1d]">ada@sparkafrica.co</strong> (editor). Any password.
          </div>
          <p className="text-xs text-[#5c5755]">
            Don&apos;t have an account?{' '}
            <Link to="/auth/register" className="font-semibold text-[#c02a10] hover:text-[#ec3013] underline-offset-2 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
