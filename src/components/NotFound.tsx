import { Link } from '@tanstack/react-router';
import { Button } from './ui/button';

export function NotFound() {
	return (
		<div className="min-h-[60vh] bg-[#f3f2f2] px-6 py-16 text-[#201e1d]">
			<div className="mx-auto max-w-3xl border-2 border-[#201e1d] bg-[#f9f8f7] p-8 md:p-12">
				<div className="mb-8 text-[11px] font-semibold tracking-[0.14em] text-[#ec3013] uppercase">
					404 error
				</div>
				<h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#201e1d] md:text-[42px]">
					Page not found
				</h1>
				<p className="mt-4 max-w-xl text-base leading-7 text-[#5c5755]">
					The invoice, memo or page you’re looking for doesn’t exist or was
					moved.
				</p>
				<div className="mt-8 flex flex-wrap gap-4">
					<Button render={<Link to="/dashboard" />} nativeButton={false}>
						Go to dashboard
					</Button>
					<Button
						render={<Link to="/invoices" />}
						variant="outline"
						nativeButton={false}
					>
						Back to invoices
					</Button>
				</div>
			</div>
		</div>
	);
}
