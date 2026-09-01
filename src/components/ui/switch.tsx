'use client';

import { Switch } from '@base-ui/react/switch';
import type * as React from 'react';
import { cn } from '#/lib/utils.ts';

function SwitchComponent({
	className,
	size = 'default',
	...props
}: React.ComponentProps<typeof Switch.Root> & {
	size?: 'sm' | 'default';
}) {
	return (
		<Switch.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				'peer group/switch inline-flex shrink-0 items-center border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
				className,
			)}
			{...props}
		>
			<Switch.Thumb
				data-slot="switch-thumb"
				className={cn(
					'pointer-events-none block bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground',
				)}
			/>
		</Switch.Root>
	);
}

export { SwitchComponent as Switch };
