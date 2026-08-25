import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient()

  return {
    queryClient,
    session: null as import('better-auth').Session | null,
    user: null as import('better-auth').User | null,
  }
}
export default function TanstackQueryProvider() {}
