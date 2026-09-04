// @ts-nocheck
'use client';

import type { InvoiceFormApi } from '#/components/forms/InvoiceForm';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import {
	useBanks,
	useBusinesses,
	useClients,
	useCompanies,
} from '#/hooks/useReferences';

function formatMoney(n: number, currency: string) {
	try {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
			style: 'currency',
			currency,
		}).format(n);
	} catch {
		return `${currency} ${n.toFixed(2)}`;
	}
}

export function InvoiceLivePreview({ form }: { form: InvoiceFormApi }) {
	const { data: businessesData } = useBusinesses();
	const { data: companiesData } = useCompanies();
	const { data: clientsData } = useClients();
	const { data: banksData } = useBanks();

	return (
		<form.Subscribe
			selector={(s) =>
				[
					s.values.businessId,
					s.values.companyId,
					s.values.clientId,
					s.values.number,
					s.values.issueDate,
					s.values.dueDate,
					s.values.currency,
					s.values.taxName,
					s.values.taxRate,
					s.values.description,
					s.values.memo,
					s.values.paymentType,
					s.values.paymentMethod,
					s.values.bankId,
					s.values.payLink,
					s.values.payLinkLabel,
					s.values.items,
					s.values.tranches,
					s.values.status,
				] as const
			}
		>
			{([
				businessId,
				companyId,
				clientId,
				number,
				issueDate,
				dueDate,
				currency,
				taxName,
				taxRate,
				description,
				memo,
				paymentType,
				paymentMethod,
				bankId,
				payLink,
				_payLinkLabel,
				items,
				tranches,
				_status,
			]) => {
				const business = businessesData?.businesses?.find(
					(b: { id: string }) => b.id === businessId,
				) as
					| { id: string; name: string; prefix: string; logo: string | null }
					| undefined;
				const company = companiesData?.companies?.find(
					(c: { id: string }) => c.id === companyId,
				) as
					| {
							id: string;
							name: string;
							reg: string | null;
							address: string | null;
							tin: string | null;
					  }
					| undefined;
				const client = clientsData?.clients?.find(
					(c: { id: string }) => c.id === clientId,
				) as
					| {
							id: string;
							name: string;
							reg: string | null;
							address: string | null;
							email: string | null;
					  }
					| undefined;
				const bank = banksData?.banks?.find(
					(b: { id: string }) => b.id === bankId,
				) as
					| { id: string; label: string; fields: Array<[string, string]> }
					| undefined;

				const cur = (currency as string) || 'NGN';
				const rate = Number((taxRate as string) || 0);
				const tName = (taxName as string) || 'VAT';

				const issueFmt = issueDate
					? new Date(issueDate as string).toLocaleDateString('en-GB', {
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						})
					: '—';
				const dueFmt = dueDate
					? new Date(dueDate as string).toLocaleDateString('en-GB', {
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						})
					: '—';

				const itemList =
					(items as Array<{
						name: string;
						description?: string | null;
						qty: string;
						cost: string;
						discountPct?: string;
						discountAmt?: string;
					}>) || [];
				const trancheList =
					(tranches as Array<{
						name: string;
						deliverables?: string | null;
						dueDate?: string | null;
						amount: string;
						paid?: boolean;
					}>) || [];

				let subtotal = 0;
				for (const it of itemList) {
					const qty = Number(it.qty || 0);
					const cost = Number(it.cost || 0);
					const amt = qty * cost;
					const disc =
						Number(it.discountAmt || 0) +
						(amt * Number(it.discountPct || 0)) / 100;
					subtotal += amt - disc;
				}
				const taxAmount = subtotal * (rate / 100);
				const total = subtotal + taxAmount;

				const lines =
					paymentType === 'tranche' && trancheList.length > 0
						? trancheList.map((t) => {
								const amt = Number(t.amount || 0);
								const tax = (amt * rate) / 100;
								return {
									name: t.name || '—',
									deliverables: t.deliverables || '—',
									due: t.dueDate
										? new Date(t.dueDate).toLocaleDateString('en-GB', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
											})
										: '—',
									amount: formatMoney(amt, cur),
									tax: formatMoney(tax, cur),
									total: formatMoney(amt + tax, cur),
								};
							})
						: itemList.map((it) => {
								const qty = Number(it.qty || 0);
								const cost = Number(it.cost || 0);
								const amt = qty * cost;
								const disc =
									Number(it.discountAmt || 0) +
									(amt * Number(it.discountPct || 0)) / 100;
								const net = amt - disc;
								const tax = (net * rate) / 100;
								return {
									name: it.name || '—',
									deliverables: it.description || '—',
									due: dueFmt,
									amount: formatMoney(net, cur),
									tax: formatMoney(tax, cur),
									total: formatMoney(net + tax, cur),
								};
							});

				const nextUnpaid = trancheList.find((t) => !t.paid);
				const dueNow = nextUnpaid
					? formatMoney(Number(nextUnpaid.amount) * (1 + rate / 100), cur)
					: formatMoney(0, cur);

				return (
					<div className="flex flex-col gap-2">
						<div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
							LIVE PREVIEW
						</div>
						<div
							className="w-full bg-white flex flex-col gap-3 text-[11px] leading-[1.4] overflow-hidden"
							style={{
								boxShadow: '0 2px 14px rgba(32,30,29,0.14)',
								padding: 16,
							}}
						>
							<div className="flex justify-between items-start gap-4">
								{business?.logo ? (
									<img
										src={business.logo}
										alt={business.name}
										width={120}
										height={24}
										className="h-6 w-auto"
									/>
								) : (
									<img
										src="/assets/spark-logo.png"
										alt="Spark"
										width={120}
										height={24}
										className="h-6 w-auto"
									/>
								)}
								<div className="text-right">
									<div className="text-[16px] font-medium tracking-[0.02em] leading-none">
										INVOICE
									</div>
									<div className="mt-1 text-[11px]">
										No. {(number as string) || '—'}
									</div>
									<div className="text-[11px]">Date: {issueFmt}</div>
								</div>
							</div>

							<div className="h-0.5 bg-[#201e1d]" />

							<div className="grid grid-cols-2 gap-4 text-[11px]">
								<div>
									<div className="text-[9px] font-semibold tracking-[0.12em] text-[#c02a10] mb-1">
										FROM
									</div>
									<div className="font-semibold">{company?.name || '—'}</div>
									{company?.reg && <div>{company.reg}</div>}
									{company?.address && <div>{company.address}</div>}
									{company?.tin && <div>TIN: {company.tin}</div>}
								</div>
								<div>
									<div className="text-[9px] font-semibold tracking-[0.12em] text-[#c02a10] mb-1">
										BILL TO
									</div>
									<div className="font-semibold">{client?.name || '—'}</div>
									{client?.reg && <div>{client.reg}</div>}
									{client?.address && <div>{client.address}</div>}
									{client?.email && <div>{client.email}</div>}
								</div>
							</div>

							<div className="border-y border-[#d6d3d1] py-2 text-[11px]">
								<strong>Re:</strong> {(description as string) || '—'}
							</div>

							<div className="overflow-x-auto">
								<Table className="w-full border-collapse min-w-0">
									<TableHeader>
										<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
											<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto">
												MILESTONE
											</TableHead>
											<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto">
												DELIVERABLES
											</TableHead>
											<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto">
												DUE
											</TableHead>
											<TableHead className="text-right py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto">
												AMOUNT
											</TableHead>
											<TableHead className="text-right py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto">
												TAX
											</TableHead>
											<TableHead className="text-right py-1 text-[8px] tracking-widest font-semibold h-auto">
												TOTAL
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{lines.length === 0 ? (
											<TableRow className="border-b border-[#d6d3d1]">
												<TableCell
													colSpan={6}
													className="py-2 text-center text-[11px] text-[#5c5755]"
												>
													No items
												</TableCell>
											</TableRow>
										) : (
											lines.map((l, i) => (
												<TableRow
													key={i}
													className="border-b border-[#d6d3d1] hover:bg-transparent"
												>
													<TableCell className="py-1 pr-1 font-semibold align-top text-[11px]">
														{l.name}
													</TableCell>
													<TableCell className="py-1 pr-1 align-top text-[11px]">
														{l.deliverables}
													</TableCell>
													<TableCell className="py-1 pr-1 align-top text-[11px] whitespace-nowrap">
														{l.due}
													</TableCell>
													<TableCell className="py-1 pr-1 text-right align-top tabular-nums text-[11px]">
														{l.amount}
													</TableCell>
													<TableCell className="py-1 pr-1 text-right align-top tabular-nums text-[11px]">
														{l.tax}
													</TableCell>
													<TableCell className="py-1 text-right align-top font-semibold tabular-nums text-[11px]">
														{l.total}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							<div className="grid grid-cols-[1fr_160px] gap-4 text-[11px]">
								<div />
								<div>
									<div className="flex justify-between py-1 border-b border-[#d6d3d1]">
										<span>Subtotal</span>
										<span className="tabular-nums font-semibold">
											{formatMoney(subtotal, cur)}
										</span>
									</div>
									<div className="flex justify-between py-1 border-b border-[#d6d3d1]">
										<span>
											{tName} ({rate}%)
										</span>
										<span className="tabular-nums font-semibold">
											{formatMoney(taxAmount, cur)}
										</span>
									</div>
									<div className="flex justify-between py-1.5 border-b-2 border-[#201e1d] font-bold text-[11px]">
										<span>Total due</span>
										<span className="tabular-nums">
											{formatMoney(total, cur)}
										</span>
									</div>
									<div className="flex justify-between items-baseline mt-2 bg-[#ec3013] text-white p-2">
										<span className="text-[8px] tracking-widest font-semibold">
											DUE NOW
										</span>
										<span className="font-bold text-[11px] tabular-nums">
											{dueNow}
										</span>
									</div>
								</div>
							</div>

							<div className="h-0.5 bg-[#201e1d]" />

							<div className="grid grid-cols-2 gap-4 text-[11px]">
								<div>
									<div className="text-[9px] font-semibold tracking-[0.12em] text-[#c02a10] mb-1">
										PAYMENT — {paymentMethod === 'link' ? 'LINK' : 'BANK'}
									</div>
									{paymentMethod === 'bank' ? (
										<>
											<div>Bank: {bank?.label || '—'}</div>
											{bank?.fields?.map(([k, v]) => (
												<div key={k}>
													{k}: {v}
												</div>
											))}
										</>
									) : (
										<div className="break-all">
											{(payLink as string) || '—'}
										</div>
									)}
								</div>
								<div className="text-[10px] text-[#5c5755]">
									{(memo as string) ||
										'Withholding tax of 5% applies per clause 5.5; please remit WHT credit note with payment.'}
								</div>
							</div>
						</div>
						<div className="text-[10px] text-[#5c5755] text-center">
							Live preview — updates as you type
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
