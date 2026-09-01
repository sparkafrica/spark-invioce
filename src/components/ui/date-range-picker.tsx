'use client';

import {
	addDays,
	endOfMonth,
	endOfWeek,
	format,
	startOfMonth,
	startOfWeek,
	subMonths,
} from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#/components/ui/popover';
import { cn } from '#/lib/utils';

export interface DateRange {
	from: Date | undefined;
	to: Date | undefined;
	preset: string;
}

export interface DateRangePickerProps {
	value: DateRange;
	onChange: (value: DateRange) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

const PRESETS: Array<{
	label: string;
	value: string;
	getRange: () => { from: Date; to: Date };
}> = [
	{
		label: 'Today',
		value: 'today',
		getRange: () => {
			const now = new Date();
			return { from: now, to: now };
		},
	},
	{
		label: 'Yesterday',
		value: 'yesterday',
		getRange: () => {
			const yesterday = addDays(new Date(), -1);
			return { from: yesterday, to: yesterday };
		},
	},
	{
		label: 'This Week',
		value: 'this_week',
		getRange: () => {
			const now = new Date();
			return {
				from: startOfWeek(now, { weekStartsOn: 1 }),
				to: endOfWeek(now, { weekStartsOn: 1 }),
			};
		},
	},
	{
		label: 'This Month',
		value: 'this_month',
		getRange: () => {
			const now = new Date();
			return { from: startOfMonth(now), to: endOfMonth(now) };
		},
	},
	{
		label: 'Last 4 Months',
		value: 'last_4_months',
		getRange: () => {
			const now = new Date();
			return { from: startOfMonth(subMonths(now, 3)), to: endOfMonth(now) };
		},
	},
];

export function DateRangePicker({
	value,
	onChange,
	placeholder = 'Select date range',
	disabled,
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);

	const handlePresetClick = useCallback(
		(preset: (typeof PRESETS)[0]) => {
			const range = preset.getRange();
			onChange({ from: range.from, to: range.to, preset: preset.value });
			setOpen(false);
		},
		[onChange],
	);

	const handleDayClick = useCallback(
		(range: { from?: Date; to?: Date } | undefined) => {
			if (!range || !range.from) {
				onChange({ from: undefined, to: undefined, preset: 'custom' });
				return;
			}

			if (range.from && range.to) {
				onChange({ from: range.from, to: range.to, preset: 'custom' });
				setOpen(false);
			}
		},
		[onChange],
	);

	const handleClear = useCallback(() => {
		onChange({ from: undefined, to: undefined, preset: 'custom' });
	}, [onChange]);

	const displayValue = useCallback(() => {
		if (!value.from && !value.to) return placeholder;
		if (value.preset !== 'custom' && value.preset) {
			const preset = PRESETS.find((p) => p.value === value.preset);
			return preset?.label || 'Custom';
		}
		if (value.from && value.to) {
			return `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`;
		}
		if (value.from) {
			return `${format(value.from, 'MMM d, yyyy')} – ...`;
		}
		return placeholder;
	}, [value, placeholder]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						aria-haspopup="dialog"
						disabled={disabled}
						className={cn(
							'w-full justify-between text-left',
							!value.from && !value.to && 'text-muted-foreground',
							className,
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
						<span className="truncate flex-1">{displayValue()}</span>
						{(value.from || value.to) && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="ml-2 h-7 w-7"
								onClick={(e) => {
									e.stopPropagation();
									handleClear();
								}}
								aria-label="Clear date range"
							>
								<XIcon className="h-4 w-4" />
							</Button>
						)}
					</Button>
				}
			/>
			<PopoverContent className="w-auto p-0" sideOffset={5} align="start">
				<div className="flex flex-col gap-0 p-2">
					<div className="grid grid-cols-2 gap-1 p-2 border-b border-border">
						{PRESETS.map((preset) => (
							<Button
								key={preset.value}
								type="button"
								variant={value.preset === preset.value ? 'default' : 'ghost'}
								size="sm"
								className="h-8 w-full justify-start text-xs"
								onClick={() => handlePresetClick(preset)}
								disabled={disabled}
							>
								{preset.label}
							</Button>
						))}
					</div>
					<div className="p-2">
						<Calendar
							mode="range"
							selected={
								value.from
									? { from: value.from, to: value.to || value.from }
									: undefined
							}
							onSelect={handleDayClick}
							numberOfMonths={2}
							disabled={disabled}
							className="rounded-none border-0 shadow-none"
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
