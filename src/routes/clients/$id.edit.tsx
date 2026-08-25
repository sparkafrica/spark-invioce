import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/clients/$id/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/clients/$id/edit"!</div>
}
