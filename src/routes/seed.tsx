import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { sendSeedToken, verifySeedToken } from '#/lib/server-fns/seed-token';
import { seedDb, clearDb, getSeedStatus } from '#/lib/server-fns/seed';
import { toast } from '#/components/ui/toast';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';

export const Route = createFileRoute('/seed')({
	beforeLoad: async () => {
		const status = await getSeedStatus();
		if (!status.empty) {
			throw redirect({ to: '/auth/login' });
		}
	},
	component: SeedPage,
});

function SeedPage() {
	const needsOrgId = !process.env.ORGANIZATION_ID;
	const [stage, setStage] = useState<'token' | 'verify'>('token');
	const [token, setToken] = useState('');
	const [sending, setSending] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [seeding, setSeeding] = useState(false);
	const [clearing, setClearing] = useState(false);

	const handleSendToken = async () => {
		setSending(true);
		try {
			await sendSeedToken();
			toast.add({
				title: 'Token sent',
				description: 'Check your email for the 6-digit seed token',
				type: 'success',
			});
			setStage('verify');
		} catch (e: any) {
			toast.add({
				description: e.message || 'Failed to send token',
				type: 'error',
			});
		} finally {
			setSending(false);
		}
	};

	const handleVerifyToken = async () => {
		if (token.length !== 6) {
			toast.add({ description: 'Token must be 6 digits', type: 'error' });
			return;
		}
		setVerifying(true);
		try {
			const result = await verifySeedToken({ data: { token } });
			if (result.valid) {
				toast.add({
					title: 'Token verified',
					description: 'Seeding database...',
					type: 'success',
				});
				await seedDatabase();
			} else {
				toast.add({
					title: 'Invalid token',
					description: 'Token is invalid or expired',
					type: 'error',
				});
			}
		} catch (e: any) {
			toast.add({
				description: e.message || 'Verification failed',
				type: 'error',
			});
		} finally {
			setVerifying(false);
		}
	};

	const seedDatabase = async () => {
		setSeeding(true);
		try {
			const result = await seedDb();
			toast.add({
				title: 'Seeded successfully',
				description: `Organization ${result.organizationId} created`,
				type: 'success',
			});
			window.location.href = '/auth/login';
		} catch (e: any) {
			toast.add({
				title: 'Seed failed',
				description: e.message || 'Database seeding failed',
				type: 'error',
			});
		} finally {
			setSeeding(false);
		}
	};

	const handleClearDb = async () => {
		if (!confirm('This will DELETE ALL DATA. Are you sure?')) return;
		setClearing(true);
		try {
			await clearDb();
			toast.add({
				title: 'Database cleared',
				description: 'All data has been removed',
				type: 'success',
			});
			window.location.reload();
		} catch (e: any) {
			toast.add({ description: e.message || 'Clear failed', type: 'error' });
		} finally {
			setClearing(false);
		}
	};

	const isLoading = sending || verifying || seeding || clearing;

	return (
		<div className="min-h-screen bg-[#f3f2f2] flex items-center justify-center p-6">
			<div className="w-full max-w-560 bg-white border-2 border-[#201e1d] p-6">
				<h1 className="text-[22px] font-bold tracking-[-0.01em] leading-none mb-4 text-[#201e1d]">
					Seed Spark Invoice
				</h1>

				{needsOrgId && (
					<div className="mb-6 p-4 bg-[#fff2ef] border border-[#ec3013] rounded-none">
						<p className="text-[13px] text-[#201e1d] mb-3">
							<strong>Organization ID not configured.</strong> Add{' '}
							<code className="bg-[#f3f2f2] px-1.5 py-0.5 font-mono text-[11px]">
								ORGANIZATION_ID=your-org-id
							</code>{' '}
							to{' '}
							<code className="bg-[#f3f2f2] px-1.5 py-0.5 font-mono text-[11px]">
								.env.local
							</code>{' '}
							and redeploy before seeding.
						</p>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigator.clipboard.writeText('ORGANIZATION_ID=')}
							className="text-xs font-semibold text-[#ec3013] hover:underline rounded-none h-auto p-0 justify-start"
						>
							Copy to clipboard
						</Button>
					</div>
				)}

				<div className="text-[13px] text-[#5c5755] mb-6 leading-relaxed">
					<p className="mb-3">This will create a demo organization with:</p>
					<ul className="list-disc list-inside space-y-1 text-[12px] mb-3">
						<li>
							3 businesses: New Business (SPK), Africa Startup Festival (ASF),
							Africa Technology Expo (ATE)
						</li>
						<li>2 invoicing companies: Nigeria (NGN), United Kingdom (GBP)</li>
						<li>3 bank accounts with dynamic fields</li>
						<li>6 products/services from template catalogue</li>
						<li>9 clients including B4B Partners + ASF Kenya clients</li>
						<li>9+ invoices with tranches, activity log, and memos</li>
						<li>FX rates (7 currencies)</li>
					</ul>
					<p className="text-[11px] font-semibold text-[#c02a10]">
						Demo users: clinton@sparkafrica.co (owner), kingsonseang@gmail.com
						(admin), ada@sparkafrica.co (editor), tolu@sparkafrica.co (invited).
						Password for all: <code className="font-mono">spark</code>
					</p>
				</div>

				{stage === 'token' && (
					<div className="space-y-3">
						<Button
							variant="default"
							onClick={handleSendToken}
							disabled={isLoading || needsOrgId}
							className="w-full bg-[#ec3013] text-white border border-[#ec3013] px-4 py-3 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
						>
							{sending ? 'Sending token…' : 'Send Seed Token to Owner Email'}
						</Button>
						<Button
							variant="outline"
							onClick={handleClearDb}
							disabled={isLoading}
							className="w-full border border-[#201e1d] bg-white px-4 py-3 text-xs font-semibold hover:bg-[#f0dcd8] disabled:opacity-50 rounded-none"
						>
							{clearing ? 'Clearing…' : 'Clear Database'}
						</Button>
					</div>
				)}

				{stage === 'verify' && (
					<div className="space-y-3">
						<div className="flex flex-col gap-1">
							<Label className="text-[11px] font-semibold text-[#201e1d]">
								Enter 6-digit token
							</Label>
							<Input
								type="text"
								value={token}
								onChange={(e) =>
									setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
								}
								placeholder="123456"
								className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] text-center tracking-widest focus-visible:outline-2 focus-visible:outline-[#ec3013] rounded-none"
								maxLength={6}
								autoFocus
							/>
						</div>
						<div className="flex gap-2">
							<Button
								variant="default"
								onClick={handleVerifyToken}
								disabled={isLoading || token.length !== 6}
								className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] px-4 py-3 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
							>
								{verifying ? 'Verifying…' : 'Verify & Seed'}
							</Button>
							<Button
								variant="outline"
								onClick={() => setStage('token')}
								disabled={isLoading}
								className="flex-1 border border-[#201e1d] bg-white px-4 py-3 text-xs font-semibold hover:bg-[#f0dcd8] disabled:opacity-50 rounded-none"
							>
								Back
							</Button>
						</div>
					</div>
				)}

				{isLoading && stage === 'verify' && seeding && (
					<div className="mt-4 text-center text-[12px] text-[#5c5755]">
						Seeding database, please wait…
					</div>
				)}
			</div>
		</div>
	);
}
