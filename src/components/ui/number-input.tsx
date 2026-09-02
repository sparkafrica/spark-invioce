'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '#/components/ui/input-group';
import { cn } from '#/lib/utils';

type NumberInputProps = Omit<
	React.ComponentProps<'input'>,
	'value' | 'defaultValue' | 'onChange'
> & {
	value?: number | null;
	defaultValue?: number;
	onValueChange?: (value: number | null) => void;
	onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	min?: number;
	max?: number;
	step?: number;
	decimals?: number;
	locale?: string;
	prefix?: React.ReactNode;
	suffix?: React.ReactNode;
	startControl?: React.ReactNode;
	endControl?: React.ReactNode;
	showControls?: boolean;
};

function formatNumber(
	value: number | null | undefined,
	decimals: number,
	locale: string,
) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return '';
	}

	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: true,
	}).format(value);
}

function parseNumber(rawValue: string, decimals: number) {
	if (rawValue.trim() === '') {
		return null;
	}

	const normalized = rawValue.replace(/,/g, '').replace(/[^\d.-]/g, '');
	if (
		!normalized ||
		normalized === '-' ||
		normalized === '.' ||
		normalized === '-.'
	) {
		return null;
	}

	const numeric = Number(normalized);
	if (!Number.isFinite(numeric)) {
		return null;
	}

	const rounded = Number(numeric.toFixed(decimals));
	return Number.isFinite(rounded) ? rounded : null;
}

export function NumberInput({
	value,
	defaultValue,
	onValueChange,
	onChange,
	min,
	max,
	step = 1,
	decimals = 2,
	locale = 'en-US',
	prefix,
	suffix,
	startControl,
	endControl,
	showControls = false,
	className,
	disabled,
	...props
}: NumberInputProps) {
	const isControlled = value !== undefined;
	const initialValue = value !== undefined ? value : (defaultValue ?? null);

	const resolvedValue = React.useMemo(
		() => (isControlled ? (value ?? null) : initialValue),
		[isControlled, value, initialValue],
	);

	const numericValue = React.useMemo(
		() =>
			resolvedValue === null || resolvedValue === undefined
				? null
				: Number(resolvedValue),
		[resolvedValue],
	);

	const displayValue = React.useMemo(
		() => formatNumber(numericValue, decimals, locale),
		[numericValue, decimals, locale],
	);

	const updateValue = React.useCallback(
		(nextValue: number | null) => {
			if (min !== undefined && nextValue !== null && nextValue < min) {
				nextValue = min;
			}
			if (max !== undefined && nextValue !== null && nextValue > max) {
				nextValue = max;
			}
			onValueChange?.(nextValue);
		},
		[min, max, onValueChange],
	);

	const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = event.target.value;
		const numericValue = parseNumber(rawValue, decimals);
		updateValue(numericValue);
		onChange?.(event);
	};

	const stepValue = (direction: number) => {
		if (resolvedValue === null || Number.isNaN(resolvedValue)) {
			const baseValue = min ?? 0;
			updateValue(baseValue + direction * step);
			return;
		}

		updateValue(Number((resolvedValue + direction * step).toFixed(decimals)));
	};

	return (
		<InputGroup className={cn('w-full', className)}>
			{startControl && (
				<InputGroupAddon align="inline-start" className="px-2.5">
					{startControl}
				</InputGroupAddon>
			)}
			{prefix && (
				<InputGroupAddon
					align="inline-start"
					className="px-2.5 text-muted-foreground"
				>
					{prefix}
				</InputGroupAddon>
			)}
			<InputGroupInput
				{...props}
				type="text"
				inputMode="decimal"
				value={displayValue}
				onChange={handleNumberChange}
				disabled={disabled}
				className={cn('bg-white text-right', className)}
			/>
			{suffix && (
				<InputGroupAddon
					align="inline-end"
					className="px-2.5 text-muted-foreground"
				>
					{suffix}
				</InputGroupAddon>
			)}
			{(endControl || showControls) && (
				<InputGroupAddon align="inline-end" className="p-0">
					{endControl}
					{showControls && (
						<>
							<InputGroupButton
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={() => stepValue(1)}
								disabled={disabled}
								aria-label="Increase value"
							>
								<ChevronUp className="size-3.5" />
							</InputGroupButton>
							<InputGroupButton
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={() => stepValue(-1)}
								disabled={disabled}
								aria-label="Decrease value"
							>
								<ChevronDown className="size-3.5" />
							</InputGroupButton>
						</>
					)}
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}
