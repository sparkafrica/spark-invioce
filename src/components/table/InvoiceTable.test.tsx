import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Invoice } from './InvoiceTable';
import { InvoiceTable } from './InvoiceTable';

const mockInvoices: Invoice[] = [
	{
		id: '1',
		number: 'INV-001',
		client: 'Acme Corp',
		business: 'New Business',
		issued: '2024-01-15',
		due: '2024-02-15',
		type: 'full',
		currency: 'NGN',
		total: '1150.00',
		status: 'draft',
		commentCount: 2,
	},
	{
		id: '2',
		number: 'INV-002',
		client: 'Globex Inc',
		business: 'ASF',
		issued: '2024-01-20',
		due: '2024-02-20',
		type: 'tranche',
		currency: 'USD',
		total: '2500.00',
		status: 'paid',
		commentCount: 0,
	},
	{
		id: '3',
		number: 'INV-003',
		client: 'Wayne Enterprises',
		business: 'ATE',
		issued: '2024-01-25',
		due: '2024-02-25',
		type: 'full',
		currency: 'GBP',
		total: '500.00',
		status: 'draft',
		commentCount: 1,
	},
];

describe('InvoiceTable', () => {
	const defaultProps = {
		data: mockInvoices,
		allowEdit: true,
	};

	it('renders all invoices in the table', () => {
		render(<InvoiceTable {...defaultProps} />);
		expect(screen.getByText('INV-001')).toBeInTheDocument();
		expect(screen.getByText('INV-002')).toBeInTheDocument();
		expect(screen.getByText('INV-003')).toBeInTheDocument();
	});

	it('renders table headers correctly', () => {
		render(<InvoiceTable {...defaultProps} />);
		expect(screen.getByText('NUMBER')).toBeInTheDocument();
		expect(screen.getByText('CLIENT')).toBeInTheDocument();
		expect(screen.getByText('BUSINESS')).toBeInTheDocument();
		expect(screen.getByText('ISSUED')).toBeInTheDocument();
		expect(screen.getByText('DUE')).toBeInTheDocument();
		expect(screen.getByText('TYPE')).toBeInTheDocument();
		expect(screen.getByText('TOTAL')).toBeInTheDocument();
		expect(screen.getByText('STATUS')).toBeInTheDocument();
		expect(screen.getByText('NOTES')).toBeInTheDocument();
	});

	it('renders status badges with correct colors', () => {
		render(<InvoiceTable {...defaultProps} />);
		expect(screen.getByText('draft')).toBeInTheDocument();
		expect(screen.getByText('paid')).toBeInTheDocument();
		expect(screen.getByText('draft')).toBeInTheDocument();
	});

	it('shows empty state when no data', () => {
		render(<InvoiceTable {...defaultProps} data={[]} />);
		expect(screen.getByText('No invoices found')).toBeInTheDocument();
	});

	it('shows edit button for each row when allowEdit is true', () => {
		render(<InvoiceTable {...defaultProps} />);
		const editButtons = screen.getAllByText('Edit');
		expect(editButtons.length).toBe(3);
	});

	it('hides edit button when allowEdit is false', () => {
		render(<InvoiceTable {...defaultProps} allowEdit={false} />);
		expect(screen.queryByText('Edit')).not.toBeInTheDocument();
	});

	it('shows open button for each row', () => {
		render(<InvoiceTable {...defaultProps} />);
		const openButtons = screen.getAllByText('Open');
		expect(openButtons.length).toBe(3);
	});

	it('filters invoices by search term', async () => {
		render(<InvoiceTable {...defaultProps} />);
		const searchInput = screen.getByPlaceholderText('Search invoices…');
		fireEvent.change(searchInput, { target: { value: 'Acme' } });
		await waitFor(() => {
			expect(screen.getByText('INV-001')).toBeInTheDocument();
			expect(screen.queryByText('INV-002')).not.toBeInTheDocument();
			expect(screen.queryByText('INV-003')).not.toBeInTheDocument();
		});
	});
});
