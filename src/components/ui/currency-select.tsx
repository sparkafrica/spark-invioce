'use client';

import { ChevronsUpDownIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '#/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#/components/ui/popover';
import {
	CURRENCY_INFO,
	type Currency,
	filterCurrencies,
} from '#/lib/currencies';
import { cn } from '#/lib/utils';

type Props = {
	value?: string;
	onValueChange: (v: Currency) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
};

export function CurrencySelect({
	value,
	onValueChange,
	placeholder = 'Select currency',
	disabled,
	className,
}: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const filtered = filterCurrencies(query);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className={cn(
							'w-full justify-between rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] font-normal h-9',
							className,
						)}
					>
						{value
							? `${value} — ${CURRENCY_INFO[value as Currency]?.name ?? value}`
							: placeholder}
						<ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
					</Button>
				}
			/>
			<PopoverContent className="w-85 p-0 rounded-none border border-[#201e1d] bg-white">
				<Command>
					<CommandInput
						placeholder="Search by code, name or country…"
						value={query}
						onValueChange={setQuery}
						className="h-9"
					/>
					<CommandList>
						<CommandEmpty>No currency found.</CommandEmpty>
						<CommandGroup>
							{filtered.map((c) => {
								const info = CURRENCY_INFO[c];
								return (
									<CommandItem
										key={c}
										value={`${info.code} ${info.name} ${info.country ?? ''}`}
										onSelect={() => {
											onValueChange(c);
											setOpen(false);
										}}
										className="rounded-none"
										data-checked={value === c}
									>
										<span className="font-medium">
											{info.code} — {info.name}
										</span>
										{/* {info.country && (
											<span className="text-xs text-muted-foreground">
												{info.country}
											</span>
										)} */}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
