'use client';

import { CalendarIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select';
import { cn } from '#/lib/utils';
import { TIMEZONES } from './date-picker';

function getTodayInTz(tz: string): string {
  return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
}
function addDaysInTz(dateStr: string, days: number, tz: string): string {
  const base = new Date(`${dateStr}T12:00:00`);
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return formatInTimeZone(next, tz, 'yyyy-MM-dd');
}
function startOfMonthInTz(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function endOfMonthInTz(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseValue(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function formatDisplay(v: string, tz: string): string {
  const d = new Date(`${v}T12:00:00`);
  return formatInTimeZone(d, tz, 'dd MMM yyyy');
}

type Range = { from?: string; to?: string };

type DateRangePickerProps = {
  value?: Range;
  onChange: (range: Range) => void;
  placeholder?: string;
  timeZone?: string;
  defaultTimeZone?: string;
  onTimeZoneChange?: (tz: string) => void;
  disabled?: boolean;
  className?: string;
};

export type DateRange = { from?: string; to?: string };

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  timeZone,
  defaultTimeZone = 'Africa/Lagos',
  onTimeZoneChange,
  disabled,
  className,
}: DateRangePickerProps) {
  const [internalTz, setInternalTz] = React.useState(defaultTimeZone);
  const tz = timeZone ?? internalTz;
  const setTz = (next: string) => {
    if (onTimeZoneChange) onTimeZoneChange(next);
    if (timeZone === undefined) setInternalTz(next);
  };
  const [open, setOpen] = React.useState(false);
  const fromDate = parseValue(value?.from);
  const toDate = parseValue(value?.to);

  const display = value?.from || value?.to
    ? `${value.from ? formatDisplay(value.from, tz) : '…'} — ${value.to ? formatDisplay(value.to, tz) : '…'}`
    : '';

  const today = getTodayInTz(tz);
  const presets: Array<{ label: string; range: Range }> = [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Last 7 days', range: { from: addDaysInTz(today, -6, tz), to: today } },
    { label: 'Last 30 days', range: { from: addDaysInTz(today, -29, tz), to: today } },
    { label: 'This month', range: { from: startOfMonthInTz(today), to: endOfMonthInTz(today) } },
    {
      label: 'Last month',
      range: (() => {
        const firstOfThis = startOfMonthInTz(today);
        const lastMonthEnd = addDaysInTz(firstOfThis, -1, tz);
        return { from: startOfMonthInTz(lastMonthEnd), to: endOfMonthInTz(lastMonthEnd) };
      })(),
    },
    {
      label: 'This quarter',
      range: (() => {
        const d = new Date(`${today}T12:00:00`);
        const q = Math.floor(d.getMonth() / 3);
        const start = new Date(d.getFullYear(), q * 3, 1);
        const end = new Date(d.getFullYear(), q * 3 + 3, 0);
        const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(start), to: fmt(end) };
      })(),
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal text-left',
              !value?.from && !value?.to && 'text-[#9b9797]',
              className,
            )}
          >
            <span className="truncate">{display || placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-50 ml-2 shrink-0" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0 rounded-none border border-[#201e1d] bg-white" align="start">
        <div className="p-3 border-b border-[#d6d3d1] space-y-2">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">TIME ZONE</div>
          <Select value={tz} onValueChange={(v) => setTz((v as string) ?? 'Africa/Lagos')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((zone) => {
                let offset = '';
                try {
                  offset = formatInTimeZone(new Date(), zone, 'XXX');
                } catch {
                  offset = '';
                }
                return (
                  <SelectItem key={zone} value={zone} className="text-xs">
                    {zone} {offset ? `(${offset})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="range"
          selected={
            fromDate || toDate
              ? { from: fromDate, to: toDate }
              : undefined
          }
          onSelect={(range) => {
            if (!range) {
              onChange({});
              return;
            }
            const from = range.from
              ? `${range.from.getFullYear()}-${String(range.from.getMonth() + 1).padStart(2, '0')}-${String(range.from.getDate()).padStart(2, '0')}`
              : undefined;
            const to = range.to
              ? `${range.to.getFullYear()}-${String(range.to.getMonth() + 1).padStart(2, '0')}-${String(range.to.getDate()).padStart(2, '0')}`
              : undefined;
            onChange({ from, to });
          }}
          numberOfMonths={2}
          captionLayout="dropdown"
          className="p-3 w-full"
        />
        <div className="p-2 border-t border-[#d6d3d1] flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(p.range);
                setOpen(false);
              }}
              className="h-7 px-2 text-[11px] rounded-none border-[#201e1d]"
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="p-2 flex justify-between gap-2 border-t border-[#d6d3d1]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({});
              setOpen(false);
            }}
            className="h-7 px-2 text-[11px] rounded-none gap-1"
          >
            <XIcon className="h-3 w-3" /> Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-3 text-[11px] rounded-none border-[#201e1d]"
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
