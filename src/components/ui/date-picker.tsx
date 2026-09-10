'use client';

import { CalendarIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select';
import { cn } from '#/lib/utils';

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
] as const;

function getTodayInTz(tz: string): string {
  return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
}
function addDaysInTz(dateStr: string, days: number, tz: string): string {
  // dateStr is YYYY-MM-DD wall in tz, add days correctly
  const base = new Date(`${dateStr}T12:00:00`);
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  // format back as wall date (tz-stable)
  return formatInTimeZone(next, tz, 'yyyy-MM-dd');
}
function formatDisplay(value: string, tz: string): string {
  if (!value) return '';
  try {
    const d = new Date(`${value}T12:00:00`);
    return formatInTimeZone(d, tz, 'dd MMM yyyy');
  } catch {
    return value;
  }
}
function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  timeZone?: string;
  defaultTimeZone?: string;
  onTimeZoneChange?: (tz: string) => void;
  disabled?: boolean;
  className?: string;
};

export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Pick a date',
  timeZone,
  defaultTimeZone = 'Africa/Lagos',
  onTimeZoneChange,
  disabled,
  className,
}: DatePickerProps) {
  const [internalTz, setInternalTz] = React.useState(defaultTimeZone);
  const tz = timeZone ?? internalTz;
  const setTz = (next: string) => {
    if (onTimeZoneChange) onTimeZoneChange(next);
    if (timeZone === undefined) setInternalTz(next);
  };
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value);
  const todayStr = getTodayInTz(tz);

  const presets: Array<{ label: string; value: string }> = [
    { label: 'Today', value: todayStr },
    { label: 'Tomorrow', value: addDaysInTz(todayStr, 1, tz) },
    { label: 'Next 7 days', value: addDaysInTz(todayStr, 7, tz) },
    { label: 'Next 30 days', value: addDaysInTz(todayStr, 30, tz) },
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
              !value && 'text-[#9b9797]',
              className,
            )}
          >
            <span className='text-ellipsis overflow-clip'>{value ? formatDisplay(value, tz) : placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-50 ml-2 shrink-0" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 rounded-none border border-[#201e1d] bg-white" align="start">
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
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) {
              onChange('');
            } else {
              // wall-date stable: format as YYYY-MM-DD from Date's wall
              const wall = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              onChange(wall);
            }
            setOpen(false);
          }}
          captionLayout="dropdown"
          className="px-3 w-full"
        />
        <div className="p-2 border-t border-[#d6d3d1] flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(p.value);
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
              onChange('');
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

export { TIMEZONES };
