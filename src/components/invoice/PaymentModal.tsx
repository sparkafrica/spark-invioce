"use client"

import React from 'react'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { XIcon, Loader2Icon } from 'lucide-react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: ({ amount, note }: { amount: string; note: string }) => void
  isPending: boolean
  invoice: {
    id: string
    number: string
    total: number
    currency: string
    status: string
  }
}

export function PaymentModal({ isOpen, onClose, onSubmit, isPending, invoice }: PaymentModalProps) {
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')

  const handleSubmit = () => {
    if (!amount) return
    onSubmit({ amount, note })
    setAmount('')
    setNote('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-none shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Record Payment</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentAmount">Amount *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{invoice.currency}</span>
                <input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2 border rounded-none bg-white"
                  disabled={isPending}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Invoice total: {formatCurrency(invoice.total)} {invoice.currency}
              </p>
            </div>

            <div>
              <Label htmlFor="paymentNote">Note (optional)</Label>
              <input
                id="paymentNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Payment reference, notes..."
                className="w-full px-4 py-2 border rounded-none bg-white"
                disabled={isPending}
              />
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
        </div>
      </div>
    </div>
  )
}
