import React, { useState, useMemo } from 'react';
import { AnalyticsTopTransaction } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Search, Tag, Calendar, User, X, Filter, ChevronDown, Check } from '@/components/ui/icons';

interface AnalyticsTableProps {
  transactions: AnalyticsTopTransaction[];
}

export function AnalyticsTable({ transactions }: AnalyticsTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('amount');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'common' | 'on_behalf'>('all');

  const filtered = useMemo(() => {
    let list = transactions || [];

    if (filterType !== 'all') {
      list = list.filter((t) => t.expenseType === filterType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q) ||
          (t.otherUserName && t.otherUserName.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (sortField === 'amount') {
        return sortAsc ? a.amountPaise - b.amountPaise : b.amountPaise - a.amountPaise;
      }
      return sortAsc
        ? a.expenseDate.localeCompare(b.expenseDate)
        : b.expenseDate.localeCompare(a.expenseDate);
    });
  }, [transactions, search, sortField, sortAsc, filterType]);

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-border bg-card/60">
        <p className="text-sm font-semibold">No transactions found</p>
        <p className="text-xs text-muted-foreground mt-1">There are no expense records matching the active filter.</p>
      </Card>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'personal':
        return (
          <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Personal
          </Badge>
        );
      case 'common':
        return (
          <Badge variant="outline" className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
            Household
          </Badge>
        );
      case 'on_behalf':
        return (
          <Badge variant="outline" className="text-[10px] font-semibold bg-violet-500/10 text-violet-400 border-violet-500/30">
            For Flatmate
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-semibold bg-muted text-muted-foreground">
            {type}
          </Badge>
        );
    }
  };

  const currentSortLabel =
    sortField === 'amount'
      ? sortAsc
        ? 'Amount (Low → High)'
        : 'Amount (High → Low)'
      : sortAsc
      ? 'Date (Oldest First)'
      : 'Date (Recent First)';

  return (
    <div
      role="region"
      aria-label="Detailed transaction list"
      className="space-y-3"
    >
      {/* Search and Dropdown Menus toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by note, category, flatmate..."
            aria-label="Filter transactions by keyword"
            className="pl-8 pr-8 h-9 text-xs bg-card/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls & Dropdown Menu */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          {filterType !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-1 rounded-lg border border-border"
            >
              <span>{filterType}</span>
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Sort & Filter Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card/80 text-xs font-medium text-foreground hover:bg-card hover:border-primary/50 transition-all touch-manipulation min-h-[36px] active:scale-95 shadow-xs"
                aria-label="Sort and filter options"
              >
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[130px] xs:max-w-none">{currentSortLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={`${sortField}-${sortAsc ? 'asc' : 'desc'}`}>
                <DropdownMenuRadioItem
                  value="amount-desc"
                  onClick={() => {
                    setSortField('amount');
                    setSortAsc(false);
                  }}
                >
                  <span>Amount (Highest First)</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="amount-asc"
                  onClick={() => {
                    setSortField('amount');
                    setSortAsc(true);
                  }}
                >
                  <span>Amount (Lowest First)</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="date-desc"
                  onClick={() => {
                    setSortField('date');
                    setSortAsc(false);
                  }}
                >
                  <span>Date (Most Recent)</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="date-asc"
                  onClick={() => {
                    setSortField('date');
                    setSortAsc(true);
                  }}
                >
                  <span>Date (Oldest First)</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Quick Type Filter</DropdownMenuLabel>
              {[
                { id: 'all', label: 'All Transactions' },
                { id: 'personal', label: 'Personal Only' },
                { id: 'common', label: 'Household Only' },
                { id: 'on_behalf', label: 'Flatmates Only' },
              ].map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={`flex items-center justify-between ${filterType === t.id ? 'text-primary font-semibold' : ''}`}
                >
                  <span>{t.label}</span>
                  {filterType === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── MOBILE CARD VIEW (Phones < 640px) ───────────────── */}
      <div className="block sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground bg-card/40 rounded-xl border border-border">
            No matching transactions found
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-xl border border-border/80 bg-card/75 shadow-xs space-y-2 touch-manipulation active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {t.expenseDate}
                </span>
                {getTypeBadge(t.expenseType)}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-foreground truncate">
                    {t.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 bg-secondary/60 px-1.5 py-0.5 rounded">
                      <Tag className="h-2.5 w-2.5 text-muted-foreground/70" />
                      {t.categoryName}
                    </span>
                    {t.otherUserName && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        <User className="h-2.5 w-2.5 text-primary" />
                        {t.otherUserName}
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-mono font-bold text-sm text-foreground shrink-0 text-right">
                  {formatPaise(t.amountPaise)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── DESKTOP TABLE VIEW (Tablets & Desktops >= 640px) ── */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xs backdrop-blur-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No matching transactions found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {t.expenseDate}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground max-w-[220px] truncate">
                    {t.description}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getTypeBadge(t.expenseType)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-muted-foreground/70" />
                      {t.categoryName}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-[11px]">
                    {t.otherUserName ? (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        <User className="h-3 w-3 text-primary" />
                        {t.otherUserName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground whitespace-nowrap">
                    {formatPaise(t.amountPaise)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
