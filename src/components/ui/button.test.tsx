import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './button';

describe('Button', () => {
	it('renders children correctly', () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole('button', { name: 'Click me' })).toBeVisible();
	});

	it('applies variant and size', () => {
		render(<Button variant="destructive">Delete</Button>);
		expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
	});

	it('handles disabled state', () => {
		render(<Button disabled>Disabled</Button>);
		expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
	});

	it('has type button by default', () => {
		render(<Button>Test</Button>);
		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	});
});
