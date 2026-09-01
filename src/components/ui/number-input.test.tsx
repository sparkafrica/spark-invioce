import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from './number-input';

describe('NumberInput', () => {
	it('formats the display value while exposing a numeric value', () => {
		const handleValueChange = vi.fn();
		render(
			<NumberInput
				value={3000}
				onValueChange={handleValueChange}
				placeholder="0.00"
			/>,
		);

		expect(screen.getByDisplayValue('3,000.00')).toBeVisible();
	});

	it('emits a numeric value when the user types', () => {
		const handleValueChange = vi.fn();
		render(
			<NumberInput value={0} onValueChange={handleValueChange} />,
		);

		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '3,000.00' } });

		expect(handleValueChange).toHaveBeenLastCalledWith(3000);
	});
});
