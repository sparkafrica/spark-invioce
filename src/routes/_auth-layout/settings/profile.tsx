import { createFileRoute } from '@tanstack/react-router';
import { SettingsLayout } from '#/components/settings/SettingsLayout';
export const Route = createFileRoute('/_auth-layout/settings/profile')({
	component: () => <SettingsLayout />,
});
