'use client';

import { Fragment, useRef } from 'react';
import type { InvoiceFormApi } from '#/components/forms/InvoiceForm';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import { moneyWithBreaks, useFittedMoneyStep } from '#/hooks/useFittedMoneyStep';
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

interface PreviewLine {
	name: string;
	deliverables: string;
	due?: string;
	qty: string;
	rate: string;
	amount: string;
	tax: string;
	total: string;
	disc: number;
	discountName: string | null;
	discountPct: string;
}

/** '10.00' -> '10', ''/'0' -> '' for the discount annotation. */
function trimPreviewPct(raw: string | null | undefined): string {
	const n = Number(raw || 0);
	return n ? String(n) : '';
}

/** Money text with <wbr> after commas so overlong figures wrap cleanly. */
function previewMoneyNodes(text: string) {
	const parts = moneyWithBreaks(text);
	return parts.map((part, k) => (
		<Fragment key={k}>
			{part}
			{k < parts.length - 1 ? <wbr /> : null}
		</Fragment>
	));
}

function PreviewLinesTable({
	lines,
	isTranche,
	sanitizedCur,
}: {
	lines: Array<PreviewLine>;
	isTranche: boolean;
	sanitizedCur: string;
}) {
	const tableRef = useRef<HTMLDivElement>(null);
	const moneyTexts = lines.flatMap((l) => [l.rate, l.amount, l.total]);
	const minMoneyPct = isTranche ? 15 : 17;
	const moneyStep = useFittedMoneyStep(
		tableRef,
		moneyTexts,
		minMoneyPct,
		[11, 10, 9],
		400,
	);
	const moneyHeaderStep = useFittedMoneyStep(
		tableRef,
		[
			`UNIT PRICE (${sanitizedCur})`,
			`AMOUNT (${sanitizedCur})`,
			`TOTAL (${sanitizedCur})`,
		],
		minMoneyPct,
		[8, 7],
		600,
	);
	const moneyTdSize =
		moneyStep === 0 ? 'text-[11px]' : moneyStep === 1 ? 'text-[10px]' : 'text-[9px]';
	const moneyThSize = moneyHeaderStep === 0 ? 'text-[8px]' : 'text-[7px]';

	return (
		<div className="overflow-x-auto min-w-0" ref={tableRef}>
			<Table className="w-full border-collapse table-fixed min-w-0">
				<colgroup>
					{isTranche ? (
						<>
							<col style={{ width: '13%' }} />
							<col style={{ width: '24%' }} />
							<col style={{ width: '9%' }} />
							<col style={{ width: '6%' }} />
							<col style={{ width: '16%' }} />
							<col style={{ width: '17%' }} />
							<col style={{ width: '15%' }} />
						</>
					) : (
						<>
							<col style={{ width: '14%' }} />
							<col style={{ width: '28%' }} />
							<col style={{ width: '6%' }} />
							<col style={{ width: '17%' }} />
							<col style={{ width: '18%' }} />
							<col style={{ width: '17%' }} />
						</>
					)}
				</colgroup>
				<TableHeader>
					<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
						<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto whitespace-normal break-words min-w-0">
							MILESTONE
						</TableHead>
						<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto whitespace-normal break-words min-w-0">
							DELIVERABLES
						</TableHead>
						{isTranche && (
							<TableHead className="text-left py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto whitespace-nowrap">
								DUE
							</TableHead>
						)}
						<TableHead className="text-center py-1 pr-1 text-[8px] tracking-widest font-semibold h-auto whitespace-nowrap">
							QTY
						</TableHead>
						<TableHead className={`text-right py-1 pr-1 ${moneyThSize} tracking-widest font-semibold h-auto whitespace-normal break-words min-w-0 overflow-hidden`}>
							UNIT PRICE ({sanitizedCur})
						</TableHead>
						<TableHead className={`text-right py-1 pr-1 ${moneyThSize} tracking-widest font-semibold h-auto whitespace-normal break-words min-w-0 overflow-hidden`}>
							AMOUNT ({sanitizedCur})
						</TableHead>
						<TableHead className={`text-right py-1 ${moneyThSize} tracking-widest font-semibold h-auto whitespace-normal break-words min-w-0 overflow-hidden`}>
							TOTAL ({sanitizedCur})
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{lines.length === 0 ? (
						<TableRow className="border-b border-[#d6d3d1]">
							<TableCell
								colSpan={isTranche ? 7 : 6}
								className="py-2 text-center text-[11px] text-[#5c5755] whitespace-normal"
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
								<TableCell className="py-1 pr-1 font-semibold align-top text-[11px] whitespace-normal break-words min-w-0">
									{l.name}
									{Math.round(l.disc * 100) / 100 > 0 ? (
										<span className="mt-0.5 block text-[10px] font-normal text-[#5c5755]">
											Less {l.discountName || 'Discount'}
											{l.discountPct ? ` ${l.discountPct}%` : ''} −
											{formatMoney(l.disc, sanitizedCur)}
										</span>
									) : null}
								</TableCell>
								<TableCell className="py-1 pr-1 align-top text-[11px] whitespace-normal break-words min-w-0">
									{l.deliverables}
								</TableCell>
								{isTranche && (
									<TableCell className="py-1 pr-1 align-top text-[11px] whitespace-nowrap">
										{l.due}
									</TableCell>
								)}
								<TableCell className={`py-1 pr-1 text-center align-top tabular-nums text-[11px] whitespace-nowrap`}>
									{l.qty}
								</TableCell>
								<TableCell className={`py-1 pr-1 text-right align-top tabular-nums ${moneyTdSize} whitespace-normal break-words min-w-0 overflow-hidden`}>
									{previewMoneyNodes(l.rate)}
								</TableCell>
								<TableCell className={`py-1 pr-1 text-right align-top tabular-nums ${moneyTdSize} whitespace-normal break-words min-w-0 overflow-hidden`}>
									{previewMoneyNodes(l.amount)}
								</TableCell>
								<TableCell className={`py-1 text-right align-top font-semibold tabular-nums ${moneyTdSize} whitespace-normal break-words min-w-0 overflow-hidden`}>
									{previewMoneyNodes(l.total)}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export function InvoiceLivePreview({ form }: { form: InvoiceFormApi }) {
	const { data: businessesData } = useBusinesses();
	const { data: companiesData } = useCompanies();
	const { data: clientsData } = useClients();
	const { data: banksData } = useBanks();

	return (
		<form.Subscribe
			selector={(s: any) =>
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
						discountName?: string | null;
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

				const sanitizedCur = String(cur || 'NGN').replace(/[^A-Za-z]/g, '').toUpperCase() || 'NGN';
				const isTranche = paymentType === 'tranche' && trancheList.length > 0;

				const lines = isTranche
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
									qty: '—',
									rate: '—',
									amount: formatMoney(amt, cur),
									tax: formatMoney(tax, cur),
									total: formatMoney(amt + tax, cur),
									disc: 0,
									discountName: null as string | null,
									discountPct: '',
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
									qty: String(qty),
									rate: formatMoney(cost, cur),
									amount: formatMoney(net, cur),
									tax: formatMoney(tax, cur),
									total: formatMoney(net + tax, cur),
									disc,
									discountName: it.discountName ?? null,
									discountPct: trimPreviewPct(it.discountPct),
								};
							});

				const nextUnpaid = trancheList.find((t) => !t.paid);
				const dueNow = isTranche
					? nextUnpaid
						? formatMoney(Number(nextUnpaid.amount) * (1 + rate / 100), cur)
						: formatMoney(0, cur)
					: formatMoney(total, cur);
				const dueOnDate = isTranche
					? nextUnpaid?.dueDate
						? new Date(nextUnpaid.dueDate).toLocaleDateString('en-GB', {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
							})
						: dueFmt
					: dueFmt;

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

							<PreviewLinesTable
								lines={lines}
								isTranche={isTranche}
								sanitizedCur={sanitizedCur}
							/>

							<div className="grid grid-cols-[1fr_192px] gap-4 text-[11px]">
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
											DUE ON {dueOnDate}
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
								{typeof memo === 'string' && memo.trim() ? (
									<div className="text-[10px] text-[#5c5755] break-words">
										{memo}
									</div>
								) : null}
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
