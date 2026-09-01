'use client';

import { Loader2Icon } from 'lucide-react';
import React from 'react';
import { Button } from '#/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '#/components/ui/dialog';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '#/components/ui/input-group';
import { Label } from '#/components/ui/label';
import { NumberInput } from '#/components/ui/number-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group';

function formatCurrency(amount: number) {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

interface Tranche {
	id: string;
	name: string;
	amount: string;
	paid: boolean;
}

interface PaymentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: ({
		amount,
		note,
		trancheId,
	}: {
		amount: string;
		note: string;
		trancheId?: string;
	}) => void;
	isPending: boolean;
	invoice: {
		id: string;
		number: string;
		total: number;
		currency: string;
		status: string;
		paymentType: 'full' | 'tranche';
		tranches: Tranche[];
	};
}

export function PaymentModal({
	isOpen,
	onClose,
	onSubmit,
	isPending,
	invoice,
}: PaymentModalProps) {
	const [amount, setAmount] = React.useState('');
	const [note, setNote] = React.useState('');
	const [selectedTrancheId, setSelectedTrancheId] = React.useState<string>('');
	const [paymentMode, setPaymentMode] = React.useState<'full' | 'partial'>(
		'full',
	);

	const unpaidTranches = invoice.tranches.filter((t) => !t.paid);

	// Auto-select first unpaid tranche when tranches exist
	React.useEffect(() => {
		if (unpaidTranches.length > 0 && !selectedTrancheId) {
			setSelectedTrancheId(unpaidTranches[0].id);
			setAmount(unpaidTranches[0].amount);
		}
	}, [unpaidTranches, selectedTrancheId]);

	// Update amount when tranche selection changes
	React.useEffect(() => {
		if (selectedTrancheId) {
			const tranche = unpaidTranches.find((t) => t.id === selectedTrancheId);
			if (tranche) {
				if (paymentMode === 'full') {
					setAmount(tranche.amount);
				}
			}
		}
	}, [selectedTrancheId, paymentMode, unpaidTranches]);

	const selectedTranche = unpaidTranches.find(
		(t) => t.id === selectedTrancheId,
	);
	const maxAmount = selectedTranche
		? Number(selectedTranche.amount)
		: Number(invoice.total);

	const handleAmountChange = (value: string) => {
		const num = Number(value);
		if (!Number.isNaN(num) && num > maxAmount) {
			setAmount(maxAmount.toFixed(2));
		} else {
			setAmount(value);
		}
	};

	const handleSubmit = () => {
		if (!amount) return;
		onSubmit({ amount, note, trancheId: selectedTrancheId || undefined });
		setAmount('');
		setNote('');
	};

	const showTrancheSelection =
		invoice.paymentType === 'tranche' && unpaidTranches.length > 0;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="bg-white rounded-none shadow-xl max-w-md w-full p-6">
				<DialogHeader className="flex flex-row items-center justify-between mb-4 space-y-0">
					<DialogTitle className="text-lg font-semibold">
						Record Payment
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{showTrancheSelection && (
						<div>
							<Label htmlFor="trancheSelect">Tranche *</Label>
							<Select
								value={selectedTrancheId || undefined}
								onValueChange={(value) => setSelectedTrancheId(value || '')}
								disabled={isPending}
							>
								<SelectTrigger id="trancheSelect" className="w-full mt-1">
									<SelectValue placeholder="Select tranche" />
								</SelectTrigger>
								<SelectContent>
									{unpaidTranches.map((tranche) => (
										<SelectItem key={tranche.id} value={tranche.id}>
											<div className="flex flex-col gap-0.5">
												<span className="font-medium">{tranche.name}</span>
												<span className="text-xs text-muted-foreground">
													{formatCurrency(Number(tranche.amount))}{' '}
													{invoice.currency}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{showTrancheSelection && (
						<div>
							<Label>Payment Type</Label>
							<ToggleGroup
								value={paymentMode === 'full' ? ['full'] : ['partial']}
								onValueChange={(groupValue) => {
									const nextValue = groupValue[0];
									if (nextValue === 'full' || nextValue === 'partial') {
										setPaymentMode(nextValue);
									}
								}}
								disabled={isPending}
								className="mt-1 w-full"
							>
								<ToggleGroupItem value="full" className="flex-1">
									Full Amount
								</ToggleGroupItem>
								<ToggleGroupItem value="partial" className="flex-1">
									Partial
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					)}

					<div>
						<Label htmlFor="paymentAmount">Amount *</Label>
						<InputGroup className="mt-1">
							<InputGroupAddon
								align="inline-start"
								className="px-3 text-muted-foreground"
							>
								{invoice.currency}
							</InputGroupAddon>
							<NumberInput
								id="paymentAmount"
								value={amount ? Number(amount) : 0}
								onValueChange={(nextValue) => {
									if (nextValue === null) {
										handleAmountChange('');
										return;
									}
									handleAmountChange(nextValue.toFixed(2));
								}}
								placeholder="0.00"
								className="w-full py-2 bg-white"
								disabled={
									isPending || (showTrancheSelection && paymentMode === 'full')
								}
								max={maxAmount}
							/>
						</InputGroup>
						<p className="text-sm text-muted-foreground mt-1">
							{showTrancheSelection && selectedTranche
								? `Tranche amount: ${formatCurrency(maxAmount)} {invoice.currency}`
								: `Invoice total: ${formatCurrency(invoice.total)} {invoice.currency}`}
							{showTrancheSelection &&
								paymentMode === 'partial' &&
								' · Partial payment allowed'}
						</p>
					</div>

					<div>
						<Label htmlFor="paymentNote">Note (optional)</Label>
						<InputGroup className="mt-1">
							<InputGroupInput
								id="paymentNote"
								type="text"
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="Payment reference, notes..."
								className="w-full px-4 py-2 bg-white"
								disabled={isPending}
							/>
						</InputGroup>
					</div>
				</div>

				<div className="flex justify-end gap-3 mt-6">
					<Button variant="ghost" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending || !amount}>
						{isPending ? (
							<span className="flex items-center gap-1">
								<Loader2Icon className="h-4 w-4 animate-spin" />
								Recording...
							</span>
						) : (
							'Record Payment'
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
