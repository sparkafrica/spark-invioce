import '@testing-library/jest-dom'
import { vi } from 'vitest'
import * as React from 'react'

// Mock environment variables
vi.mock('#/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    },
  },
}))

// Mock @tanstack/react-start/server
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
  setResponseHeader: vi.fn(),
  setResponseStatus: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock @tanstack/react-router - mock the hooks but keep actual exports
vi.mock('@tanstack/react-router', () => {
  // Use a synchronous approach that works with vitest
  return {
    useNavigate: vi.fn(),
    useSearch: vi.fn(),
    useParams: vi.fn(),
    useLoaderData: vi.fn(),
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      React.createElement('a', props, children)
    ),
    Outlet: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'outlet' }, children),
    createRoute: vi.fn(),
    redirect: vi.fn(),
  }
})

// Mock better-auth client
vi.mock('#/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
  },
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
