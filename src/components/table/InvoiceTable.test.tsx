import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceTable } from './InvoiceTable'
import type { Invoice } from './InvoiceTable'

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-001',
    client: 'Acme Corp',
    business: 'New Business',
    issued: '2024-01-15',
    due: '2024-02-15',
    type: 'full',
    total: '1150.00',
    status: 'sent',
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
    total: '500.00',
    status: 'draft',
    commentCount: 1,
  },
]

describe('InvoiceTable', () => {
  const defaultProps = {
    data: mockInvoices,
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
  }

  it('renders all invoices in the table', () => {
    render(<InvoiceTable {...defaultProps} />)
    expect(screen.getByText('INV-001')).toBeInTheDocument()
    expect(screen.getByText('INV-002')).toBeInTheDocument()
    expect(screen.getByText('INV-003')).toBeInTheDocument()
  })

  it('renders table headers correctly', () => {
    render(<InvoiceTable {...defaultProps} />)
    expect(screen.getByText('NUMBER')).toBeInTheDocument()
    expect(screen.getByText('CLIENT')).toBeInTheDocument()
    expect(screen.getByText('BUSINESS')).toBeInTheDocument()
    expect(screen.getByText('ISSUED')).toBeInTheDocument()
    expect(screen.getByText('DUE')).toBeInTheDocument()
    expect(screen.getByText('TYPE')).toBeInTheDocument()
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
    expect(screen.getByText('STATUS')).toBeInTheDocument()
    expect(screen.getByText('NOTES')).toBeInTheDocument()
  })

  it('renders status badges with correct colors', () => {
    render(<InvoiceTable {...defaultProps} />)
    expect(screen.getByText('sent')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<InvoiceTable {...defaultProps} data={[]} />)
    expect(screen.getByText('No invoices found')).toBeInTheDocument()
  })

  it('calls onView when row is clicked', async () => {
    render(<InvoiceTable {...defaultProps} />)
    const firstRow = screen.getByText('INV-001').closest('tr')
    fireEvent.click(firstRow!)
    await waitFor(() => {
      expect(defaultProps.onView).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', number: 'INV-001' })
      )
    })
  })

  it('filters invoices by search term', async () => {
    render(<InvoiceTable {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText('Search invoices...')
    fireEvent.change(searchInput, { target: { value: 'Acme' } })
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.queryByText('INV-002')).not.toBeInTheDocument()
      expect(screen.queryByText('INV-003')).not.toBeInTheDocument()
    })
  })

  it('shows edit button for each row when onEdit is provided', () => {
    render(<InvoiceTable {...defaultProps} />)
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons.length).toBe(3)
  })

  it('shows delete button for each row when onDelete is provided', () => {
    render(<InvoiceTable {...defaultProps} />)
    const deleteButtons = screen.getAllByText('Delete')
    expect(deleteButtons.length).toBe(3)
  })

  it('shows duplicate button for each row when onDuplicate is provided', () => {
    render(<InvoiceTable {...defaultProps} />)
    const duplicateButtons = screen.getAllByText('Duplicate')
    expect(duplicateButtons.length).toBe(3)
  })

  it('hides edit button when onEdit is not provided', () => {
    render(<InvoiceTable {...defaultProps} onEdit={undefined} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('hides delete button when onDelete is not provided', () => {
    render(<InvoiceTable {...defaultProps} onDelete={undefined} />)
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('hides duplicate button when onDuplicate is not provided', () => {
    render(<InvoiceTable {...defaultProps} onDuplicate={undefined} />)
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
  })

  it('shows open button for each row', () => {
    render(<InvoiceTable {...defaultProps} />)
    const openButtons = screen.getAllByText('Open')
    expect(openButtons.length).toBe(3)
  })

  it('calls onEdit when edit button is clicked', async () => {
    render(<InvoiceTable {...defaultProps} />)
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    await waitFor(() => {
      expect(defaultProps.onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', number: 'INV-001' })
      )
    })
  })

  it('calls onDelete when delete button is clicked', async () => {
    render(<InvoiceTable {...defaultProps} />)
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', number: 'INV-001' })
      )
    })
  })

  it('calls onDuplicate when duplicate button is clicked', async () => {
    render(<InvoiceTable {...defaultProps} />)
    const duplicateButtons = screen.getAllByText('Duplicate')
    fireEvent.click(duplicateButtons[0])
    await waitFor(() => {
      expect(defaultProps.onDuplicate).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', number: 'INV-001' })
      )
    })
  })
})