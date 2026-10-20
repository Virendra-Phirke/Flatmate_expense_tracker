import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, ArrowRight, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from '@/components/ui/icons';

import { BalancesSkeleton } from '@/components/ui/skeleton';
import { getSyncCachedData } from '@/lib/idb';

interface BalancesPageProps {
  onNavigateToRepayments: (targetMemberId?: string) => void;
}

export function BalancesPage({ onNavigateToRepayments }: BalancesPageProps) {
  const { data: summary, isLoading, error, refetch } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
    initialData: () => getSyncCachedData<BalanceSummary>('/balances/summary'),
  });

  if (isLoading && !summary) {
    return <BalancesSkeleton />;
  }

  if ((error && !summary) || !summary) {
    return (
      <Card className="p-4 xs:p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-negative" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">Balances could not load</h2>
            <p className="mt-1 text-xs text-muted-foreground">Try again to refresh your household totals.</p>
            <Button size="sm" className="mt-3 h-9 text-xs" onClick={() => void refetch()}>Try again</Button>
          </div>
        </div>
      </Card>
    );
  }

  const netBalance = Number(summary.owedToMe || 0) - Number(summary.owedByMe || 0);
  const debts = summary.myDebts?.filter((item) => Number(item.outstanding || 0) > 0) ?? [];
  const credits = summary.pairwise?.filter((item) => Number(item.outstanding || 0) > 0) ?? [];

  return (
    <main className="space-y-5 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            Balances & Settlement
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Bilateral netting across household bills and individual flatmate advances.
          </p>
        </div>
        <Button onClick={() => onNavigateToRepayments()} className="w-full sm:w-auto h-10 text-xs sm:text-sm font-semibold">
          Initiate repayment
          <ArrowRight className="h-3.5 w-3.5 shrink-0 ml-1.5" aria-hidden="true" />
        </Button>
      </header>

      {/* ── Net position card ────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Net position</p>
              <p className="mt-1 font-serif text-3xl xs:text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                {formatPaise(Math.abs(netBalance))}
              </p>
              <p className="mt-1.5 text-xs font-medium">
                {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'Everything is settled'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-negative-soft px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">You owe</p>
              <p className="mt-0.5 font-mono text-base xs:text-lg font-bold text-negative">{formatPaise(summary.owedByMe)}</p>
            </div>
            <div className="rounded-lg bg-positive-soft px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
              <p className="mt-0.5 font-mono text-base xs:text-lg font-bold text-positive">{formatPaise(summary.owedToMe)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Spending totals – 2 column editorial ledger ── */}
      <section aria-labelledby="other-totals-heading" className="space-y-2">
        <h2 id="other-totals-heading" className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
          Spending Totals
        </h2>
        <div className="rounded-lg border border-border bg-card divide-y xs:divide-y-0 xs:divide-x divide-border grid grid-cols-1 xs:grid-cols-2 shadow-xs overflow-hidden">
          <article className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              Common Share
            </span>
            <div className="my-2.5">
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                {formatPaise(summary.commonShare || 0)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">Paid: {formatPaise(summary.commonPaid || 0)}</p>
          </article>
          <article className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              Personal Costs
            </span>
            <div className="my-2.5">
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                {formatPaise(summary.personalSpending || 0)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">Not shared with flatmates</p>
          </article>
        </div>
      </section>

      {/* ── Member-level outstanding – 2-col on lg ────────── */}
      <section className="grid grid-cols-1 gap-3 xs:gap-4 lg:grid-cols-2" aria-label="Outstanding balances by member">
        {/* You owe */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border p-3.5 xs:p-4">
            <div className="min-w-0">
              <CardTitle className="text-sm xs:text-base font-bold text-foreground">You owe</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Flatmates to pay</p>
            </div>
            <Badge variant={debts.length ? 'neg' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5">
              {formatPaise(summary.owedByMe)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {debts.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-positive" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">No outstanding payments</p>
                <p className="mt-0.5 text-xs text-muted-foreground">You're square with your flatmates.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {debts.map((debt) => (
                  <div key={debt.creditorId} className="flex items-center gap-3 p-3 xs:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-semibold text-foreground">{debt.creditorName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {debt.crossOffset && debt.crossOffset > 0
                          ? `Repaid ${formatPaise(debt.confirmedPaid)} • Netted with mutual expenses`
                          : `Repaid ${formatPaise(debt.confirmedPaid)} of ${formatPaise(debt.grossOwe)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="amount-display text-xs xs:text-sm font-bold text-negative">{formatPaise(debt.outstanding)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToRepayments(debt.creditorId)}
                        className="h-8 px-3 text-xs font-semibold"
                      >
                        Settle
                        <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owed to you */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border p-3.5 xs:p-4">
            <div className="min-w-0">
              <CardTitle className="text-sm xs:text-base font-bold text-foreground">Owed to you</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Flatmates who owe you</p>
            </div>
            <Badge variant={credits.length ? 'pos' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5">
              {formatPaise(summary.owedToMe)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {credits.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">No pending repayments</p>
                <p className="mt-0.5 text-xs text-muted-foreground">No one owes you right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {credits.map((credit) => (
                  <div key={credit.debtorId} className="flex items-center gap-3 p-3 xs:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-semibold text-foreground">{credit.debtorName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {credit.crossOffset && credit.crossOffset > 0
                          ? `Confirmed ${formatPaise(credit.confirmedPaid)} • Netted with mutual expenses`
                          : `Confirmed ${formatPaise(credit.confirmedPaid)} of ${formatPaise(credit.grossOwed)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="amount-display text-xs xs:text-sm font-bold text-positive">{formatPaise(credit.outstanding)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToRepayments(credit.debtorId)}
                        className="h-8 px-3 text-xs font-semibold"
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
