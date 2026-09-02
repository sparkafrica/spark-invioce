import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import * as v from 'valibot';
import { auth } from '#/lib/auth';

// ============================================
// ORGANIZATION INVITE SERVER FUNCTION
// ============================================

const inviteMemberSchema = v.object({
  organizationId: v.pipe(v.string(), v.minLength(1, 'Organization ID is required')),
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  role: v.picklist(['admin', 'member']),
});

export const inviteMember = createServerFn({ method: 'POST' })
  .validator((data) => v.parse(inviteMemberSchema, data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as {
      session: { user: { id: string } } | null;
    };

    if (!ctx.session) {
      throw new Error('Unauthorized');
    }

    try {
      const request = getRequest();
      const headers = request.headers;

      const result = await auth.api.createInvitation({
        body: {
          organizationId: data.organizationId,
          name: data.name,
          email: data.email,
          role: data.role,
        },
        headers,
      });

      return {
        success: true as const,
        message: 'Invitation sent successfully',
        invitation: result,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to send invitation';

      return {
        success: false as const,
        message,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });