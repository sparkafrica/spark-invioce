import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getOrgMembers } from '#/lib/server-fns/references'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

// --- Validation & Form Imports ---
import { useForm, standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'

// --- Shadcn UI Imports ---
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDate } from "date-fns"

export const Route = createFileRoute('/team')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/auth/login', search: { redirect: '/team' } })
    return { user: session.user, session: session.session }
  },
  component: TeamPage,
})

const inviteSchema = v.object({
  name: v.optional(v.string()),
  email: v.pipe(v.string(), v.email('Please enter a valid email address')),
  role: v.picklist(['member', 'admin'], 'Please select a valid role'),
})

type InviteFormValues = v.InferOutput<typeof inviteSchema>

function TeamPage() {
  const { data: session, isPending } = authClient.useSession()
  const isAdmin = (session?.user as unknown as { role?: string })?.role === "owner" || (session?.user as unknown as { role?: string })?.role === "admin"

  const [msg, setMsg] = useState('')

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => getOrgMembers(),
  })

  // 2. Initialize TanStack Form
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: '',
    } as unknown as InviteFormValues,
    validators: {
      onChange: ({ value }) =>
        standardSchemaValidators.validate({ value, validationSource: 'field' }, inviteSchema),
      onSubmit: ({ value }) =>
        standardSchemaValidators.validate({ value, validationSource: 'form' }, inviteSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        setMsg('')
        const res = await authClient.organization.inviteMember({
          organizationId: membersData?.organizationId,
          email: value.email,
          role: value.role,
        })

        if (res?.error) throw new Error(res.error.message)

        setMsg(`Invite sent to ${value.email}`)
        form.reset()
      } catch (e: any) {
        setMsg(e.message || 'Failed to send invite')
      }
    },
  })

  if (isLoading || isPending) {
    return (
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-9 items-start">
        <div>
          <div className="border-b-2 border-[#201e1d] pb-3.5 mb-5 text-[32px] font-medium tracking-[-0.02em] leading-none">
            Team
          </div>
          <div className="rounded-none border-2 border-[#201e1d] bg-white p-4 space-y-3">
            <Skeleton className="h-6 w-full rounded-none" />
            <Skeleton className="h-6 w-full rounded-none" />
            <Skeleton className="h-6 w-full rounded-none" />
            <Skeleton className="h-6 w-3/4 rounded-none" />
          </div>
        </div>
        <div className="border-l-2 border-[#201e1d] pl-7">
          <div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
            INVITE A TEAM MEMBER
          </div>
          <div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
            <Skeleton className="h-9 w-full rounded-none" />
            <Skeleton className="h-9 w-full rounded-none" />
            <Skeleton className="h-9 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
          </div>
        </div>
      </div>
    )
  }

  const teamRows = membersData?.members || []

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-9 items-start">
      {/* Table Section */}
      <div>
        <div className="border-b-2 border-[#201e1d] pb-3.5 mb-5 text-[32px] font-medium tracking-[-0.02em] leading-none">
          Team
        </div>

        <Table className="bg-white">
          <TableHeader>
            <TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
              <TableHead className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold text-black h-auto">NAME</TableHead>
              <TableHead className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold text-black h-auto">EMAIL</TableHead>
              <TableHead className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold text-black h-auto">ROLE</TableHead>
              <TableHead className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold text-black h-auto">CREATED AT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamRows.map((m) => (
              <TableRow key={m.user.email} className="border-b border-[#d6d3d1] hover:bg-black/5">
                <TableCell className="py-3 px-3 text-[13px] font-semibold">{m.user.name}</TableCell>
                <TableCell className="py-3 px-3 text-[13px]">{m.user.email}</TableCell>
                <TableCell className="py-3 px-3 text-[13px] capitalize">{m.role === "member" ? "Editor" : m.role}</TableCell>
                <TableCell className="py-3 px-3 text-[13px] text-[#5c5755]">{formatDate(m.createdAt, "dd MMM yyyy, KK:mm:ss a")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form Section */}
      <div className="border-l-2 border-[#201e1d] pl-7">
        <div className="text-[10px] tracking-[0.12em] font-semibold mb-3">
          INVITE A TEAM MEMBER
        </div>

        {isPending ? (
          <Skeleton className="h-8 w-24 rounded-none" />
        ) : isAdmin ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="flex flex-col gap-4"
          >
            {/* Name Field */}
            <form.Field
              name="name"
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name} className="text-[11px] font-semibold">Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ada Okonkwo"
                    className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus-visible:ring-1 focus-visible:ring-[#201e1d]"
                  />
                  {field.state.meta.errors ? (
                    <p className="text-[10px] text-[#ec3013]">{field.state.meta.errors.join(', ')}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {/* Email Field */}
            <form.Field
              name="email"
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name} className="text-[11px] font-semibold">Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="ada@sparkafrica.co"
                    className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus-visible:ring-1 focus-visible:ring-[#201e1d]"
                  />
                  {field.state.meta.errors ? (
                    <p className="text-[10px] text-[#ec3013]">{field.state.meta.errors.join(', ')}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {/* Role Field */}
            <form.Field
              name="role"
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name} className="text-[11px] font-semibold">Role</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => field.handleChange(val ?? '' as unknown as any)}
                  >
                    <SelectTrigger className="rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] h-auto focus:ring-1 focus:ring-[#201e1d]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-[#201e1d]">
                      <SelectItem value="member" className="text-[13px]">Editor</SelectItem>
                      <SelectItem value="admin" className="text-[13px]">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors ? (
                    <p className="text-[10px] text-[#ec3013]">{field.state.meta.errors.join(', ')}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {/* Submit Button & Messages */}
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="rounded-none bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-4 text-xs font-semibold hover:bg-[#c02a10] w-full justify-start mt-2"
                >
                  {isSubmitting ? 'Sending...' : 'Send invite'}
                </Button>
              )}
            </form.Subscribe>

            {msg && (
              <div className="text-xs text-[#5c5755] border border-[#d6d3d1] p-2 bg-[#f3f2f2]">
                {msg}
              </div>
            )}
          </form>
        ) : (
          <div className="text-xs text-[#5c5755]">
            Only admins can invite people or change roles.
          </div>
        )}
      </div>
    </div>
  )
}
