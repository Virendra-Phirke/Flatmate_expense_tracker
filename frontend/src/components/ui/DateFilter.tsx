import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check, Filter } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';

export type DateFilterMode = 'all' | 'day' | 'range' | 'month';

export interface DateFilterValue {
  mode: DateFilterMode;
  date?: string;       // YYYY-MM-DD
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  month?: number;      // 0-11
  year?: number;       // e.g. 2026
}

export interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
  totalRecords?: number;
  filteredCount?: number;
  filteredTotalPaise?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateString(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getDateFilterRange(filter: DateFilterValue): { from?: string; to?: string } {
  if (filter.mode === 'all') return {};

  if (filter.mode === 'day') {
    if (!filter.date) return {};
    return { from: filter.date, to: filter.date };
  }

  if (filter.mode === 'range') {
    if (!filter.startDate) return {};
    const start = filter.startDate;
    const end = filter.endDate || filter.startDate;
    return start <= end ? { from: start, to: end } : { from: end, to: start };
  }

  if (filter.mode === 'month') {
    if (filter.month === undefined || filter.year === undefined) return {};
    const y = filter.year;
    const m = filter.month;
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }

  return {};
}

export function matchesDateFilter(expenseDate: string | undefined | null, filter: DateFilterValue): boolean {
  if (filter.mode === 'all') return true;
  if (!expenseDate) return false;

  const cleanDate = expenseDate.split('T')[0];
  const { from, to } = getDateFilterRange(filter);

  if (from && cleanDate < from) return false;
  if (to && cleanDate > to) return false;
  return true;
}

export function formatFilterLabel(filter: DateFilterValue): string {
  if (filter.mode === 'all') return 'All dates';

  if (filter.mode === 'day') {
    return filter.date ? `Day: ${formatDate(filter.date)}` : 'Select day';
  }

  if (filter.mode === 'range') {
    if (filter.startDate && filter.endDate) {
      if (filter.startDate === filter.endDate) {
        return `Day: ${formatDate(filter.startDate)}`;
      }
      return `${formatDate(filter.startDate)} – ${formatDate(filter.endDate)}`;
    }
    if (filter.startDate) {
      return `From ${formatDate(filter.startDate)}`;
    }
    return 'Select date range';
  }

  if (filter.mode === 'month') {
    if (filter.month !== undefined && filter.year !== undefined) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNames[filter.month]} ${filter.year}`;
    }
    return 'Select month';
  }

  return 'Date filter';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateFilter({
  value,
  onChange,
  className,
  totalRecords,
  filteredCount,
  filteredTotalPaise,
}: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date();
  const todayStr = toDateString(todayDate);

  // Calendar navigation state (which month/year is shown in view)
  const initialView = () => {
    if (value.mode === 'day' && value.date) {
      const d = parseDateString(value.date);
      return { month: d.getMonth(), year: d.getFullYear() };
    }
    if (value.mode === 'range' && value.startDate) {
      const d = parseDateString(value.startDate);
      return { month: d.getMonth(), year: d.getFullYear() };
    }
    if (value.mode === 'month' && value.month !== undefined && value.year !== undefined) {
      return { month: value.month, year: value.year };
    }
    return { month: todayDate.getMonth(), year: todayDate.getFullYear() };
  };

  const [viewDate, setViewDate] = useState(initialView);
  const [activeTab, setActiveTab] = useState<DateFilterMode>(value.mode);

  // Sync internal view when value changes
  useEffect(() => {
    setActiveTab(value.mode);
    if (value.mode === 'day' && value.date) {
      const d = parseDateString(value.date);
      setViewDate({ month: d.getMonth(), year: d.getFullYear() });
    } else if (value.mode === 'range' && value.startDate) {
      const d = parseDateString(value.startDate);
      setViewDate({ month: d.getMonth(), year: d.getFullYear() });
    } else if (value.mode === 'month' && value.month !== undefined && value.year !== undefined) {
      setViewDate({ month: value.month, year: value.year });
    }
  }, [value]);

  // Click outside and escape key dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const prevMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 0) return { month: 11, year: prev.year - 1 };
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const nextMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 11) return { month: 0, year: prev.year + 1 };
      return { month: prev.month + 1, year: prev.year };
    });
  };

  const prevYear = () => {
    setViewDate((prev) => ({ ...prev, year: prev.year - 1 }));
  };

  const nextYear = () => {
    setViewDate((prev) => ({ ...prev, year: prev.year + 1 }));
  };

  // Day click handler
  const handleDayClick = (dayStr: string) => {
    if (activeTab === 'day') {
      onChange({
        mode: 'day',
        date: dayStr,
      });
      setIsOpen(false);
    } else if (activeTab === 'range') {
      if (!value.startDate || (value.startDate && value.endDate)) {
        // Start new range
        onChange({
          mode: 'range',
          startDate: dayStr,
          endDate: undefined,
        });
      } else {
        // Complete range
        if (dayStr < value.startDate) {
          onChange({
            mode: 'range',
            startDate: dayStr,
            endDate: value.startDate,
          });
        } else {
          onChange({
            mode: 'range',
            startDate: value.startDate,
            endDate: dayStr,
          });
        }
        setIsOpen(false);
      }
    }
  };

  // Month select handler
  const handleMonthSelect = (mIndex: number) => {
    onChange({
      mode: 'month',
      month: mIndex,
      year: viewDate.year,
    });
    setIsOpen(false);
  };

  // Preset shortcuts
  const selectToday = () => {
    onChange({ mode: 'day', date: todayStr });
    setIsOpen(false);
  };

  const selectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    onChange({ mode: 'day', date: toDateString(yest) });
    setIsOpen(false);
  };

  const selectThisMonth = () => {
    onChange({
      mode: 'month',
      month: todayDate.getMonth(),
      year: todayDate.getFullYear(),
    });
    setIsOpen(false);
  };

  const selectLastMonth = () => {
    const prevDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
    onChange({
      mode: 'month',
      month: prevDate.getMonth(),
      year: prevDate.getFullYear(),
    });
    setIsOpen(false);
  };

  const selectLast7Days = () => {
    const start = new Date();
    start.setDate(todayDate.getDate() - 6);
    onChange({
      mode: 'range',
      startDate: toDateString(start),
      endDate: todayStr,
    });
    setIsOpen(false);
  };

  const selectLast30Days = () => {
    const start = new Date();
    start.setDate(todayDate.getDate() - 29);
    onChange({
      mode: 'range',
      startDate: toDateString(start),
      endDate: todayStr,
    });
    setIsOpen(false);
  };

  const clearFilter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange({ mode: 'all' });
    setIsOpen(false);
  };

  // Calendar Grid Calculation for viewDate
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewDate.year, viewDate.month, 0).getDate();

  const calendarCells: Array<{ dayNum: number; dateStr: string; isCurrentMonth: boolean }> = [];

  // Prev month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewDate.month === 0 ? 11 : viewDate.month - 1;
    const y = viewDate.month === 0 ? viewDate.year - 1 : viewDate.year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr, isCurrentMonth: true });
  }

  // Next month padding to fill grid
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const m = viewDate.month === 11 ? 0 : viewDate.month + 1;
    const y = viewDate.month === 11 ? viewDate.year + 1 : viewDate.year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr, isCurrentMonth: false });
  }

  const isFilterActive = value.mode !== 'all';

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
      {/* ── Main Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm border focus:outline-none focus:ring-2 focus:ring-primary/40 select-none min-h-[40px]',
              isFilterActive
                ? 'bg-primary/10 border-primary text-primary font-semibold hover:bg-primary/15'
                : 'bg-card border-border text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Calendar className={cn('h-4 w-4 shrink-0', isFilterActive ? 'text-primary' : 'text-muted-foreground')} />
            <span className="truncate max-w-[200px] sm:max-w-none">{formatFilterLabel(value)}</span>

            {isFilterActive ? (
              <span
                role="button"
                tabIndex={0}
                onClick={clearFilter}
                title="Clear filter"
                className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </span>
            ) : (
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground rotate-90'
                )}
              />
            )}
          </button>

          {/* Quick preset pill buttons for rapid 1-click filtering */}
          <div className="hidden sm:inline-flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border/70 text-xs">
            <button
              type="button"
              onClick={() => onChange({ mode: 'all' })}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors',
                value.mode === 'all'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={selectToday}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors',
                value.mode === 'day' && value.date === todayStr
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={selectThisMonth}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors',
                value.mode === 'month' && value.month === todayDate.getMonth() && value.year === todayDate.getFullYear()
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={selectLast30Days}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors',
                value.mode === 'range' && value.endDate === todayStr
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Filter status indicator pill */}
        {isFilterActive && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/30 text-[11px] font-mono py-1 px-2.5 flex items-center gap-1.5"
            >
              <Filter className="h-2.5 w-2.5" />
              <span>
                {filteredCount !== undefined ? `${filteredCount} matched` : 'Filtered'}
                {totalRecords !== undefined ? ` of ${totalRecords}` : ''}
              </span>
            </Badge>
            <button
              type="button"
              onClick={clearFilter}
              className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* ── Interactive Calendar Popover ── */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 mt-2 z-50 w-full sm:w-[350px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150',
            'top-full'
          )}
        >
          {/* Header Segment: Day, Range, Month, All */}
          <div className="grid grid-cols-4 rounded-xl bg-secondary p-1 border border-border/80 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('day');
                if (value.mode !== 'day') {
                  onChange({ mode: 'day', date: value.date || todayStr });
                }
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all text-center',
                activeTab === 'day'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('range');
                if (value.mode !== 'range') {
                  onChange({
                    mode: 'range',
                    startDate: value.startDate || todayStr,
                    endDate: value.endDate || todayStr,
                  });
                }
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all text-center',
                activeTab === 'range'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Range
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('month');
                if (value.mode !== 'month') {
                  onChange({
                    mode: 'month',
                    month: viewDate.month,
                    year: viewDate.year,
                  });
                }
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all text-center',
                activeTab === 'month'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                onChange({ mode: 'all' });
                setIsOpen(false);
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all text-center',
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
          </div>

          {/* ── Day & Range Mode Calendar ── */}
          {(activeTab === 'day' || activeTab === 'range') && (
            <div>
              {/* Navigation Bar */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous Month"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-bold text-foreground">
                  {MONTH_NAMES[viewDate.month]} {viewDate.year}
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next Month"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Range Mode Helper Hint */}
              {activeTab === 'range' && (
                <div className="mb-2 text-[11px] text-muted-foreground bg-secondary/50 p-1.5 rounded-lg text-center font-medium">
                  {!value.startDate
                    ? 'Click start date'
                    : !value.endDate
                    ? 'Click end date to complete range'
                    : `${formatDate(value.startDate)} to ${formatDate(value.endDate)}`}
                </div>
              )}

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAY_NAMES.map((w, idx) => (
                  <div key={idx} className="text-[11px] font-semibold text-muted-foreground py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarCells.map((cell, idx) => {
                  const isToday = cell.dateStr === todayStr;
                  let isSelected = false;
                  let isInRange = false;
                  let isRangeStart = false;
                  let isRangeEnd = false;

                  if (activeTab === 'day') {
                    isSelected = value.mode === 'day' && value.date === cell.dateStr;
                  } else if (activeTab === 'range') {
                    const start = value.startDate;
                    const end = value.endDate;
                    if (start && end) {
                      isRangeStart = cell.dateStr === start;
                      isRangeEnd = cell.dateStr === end;
                      isInRange = cell.dateStr >= start && cell.dateStr <= end;
                      isSelected = isRangeStart || isRangeEnd;
                    } else if (start) {
                      isRangeStart = cell.dateStr === start;
                      isSelected = isRangeStart;
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDayClick(cell.dateStr)}
                      className={cn(
                        'h-9 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-all select-none',
                        !cell.isCurrentMonth && 'text-muted-foreground/35',
                        cell.isCurrentMonth && 'text-foreground',
                        isToday && !isSelected && 'ring-1 ring-primary/60 font-bold',
                        isInRange && !isSelected && 'bg-primary/15 text-primary font-semibold rounded-none',
                        isSelected && 'bg-primary text-primary-foreground font-bold shadow-sm',
                        isRangeStart && value.endDate && 'rounded-l-lg rounded-r-none',
                        isRangeEnd && value.startDate && 'rounded-r-lg rounded-l-none',
                        !isSelected && !isInRange && cell.isCurrentMonth && 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Quick shortcut chips */}
              <div className="mt-3 pt-3 border-t border-border/70 flex flex-wrap gap-1.5">
                {activeTab === 'day' ? (
                  <>
                    <button
                      type="button"
                      onClick={selectToday}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={selectYesterday}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Yesterday
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={selectLast7Days}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={selectLast30Days}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={selectThisMonth}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={selectLastMonth}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Last Month
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Month Mode Calendar ── */}
          {activeTab === 'month' && (
            <div>
              {/* Year Navigation Bar */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevYear}
                  aria-label="Previous Year"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-base font-bold text-foreground">{viewDate.year}</div>
                <button
                  type="button"
                  onClick={nextYear}
                  aria-label="Next Year"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_SHORT.map((name, idx) => {
                  const isSelected =
                    value.mode === 'month' &&
                    value.month === idx &&
                    (value.year || todayDate.getFullYear()) === viewDate.year;

                  const isCurrent =
                    todayDate.getMonth() === idx &&
                    todayDate.getFullYear() === viewDate.year;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMonthSelect(idx)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-semibold transition-all select-none',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : isCurrent
                          ? 'border border-primary/60 text-foreground hover:bg-accent font-bold'
                          : 'bg-secondary/50 text-foreground hover:bg-accent'
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Quick Shortcuts */}
              <div className="mt-4 pt-3 border-t border-border/70 flex gap-2">
                <button
                  type="button"
                  onClick={selectThisMonth}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors text-center"
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={selectLastMonth}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors text-center"
                >
                  Last Month
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={clearFilter}
              className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Clear Filter
            </button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs min-h-[32px] px-3.5"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateFilter;
