import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPaise } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Mic,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  AlertCircle,
  ChevronRight,
} from '@/components/ui/icons';

import { DashboardSkeleton } from '@/components/ui/skeleton';
import { getSyncCachedData } from '@/lib/idb';

interface ActivityItem {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
}

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenVoice: () => void;
}

export function DashboardPage({ onNavigate, onOpenVoice }: DashboardPageProps) {
  const { user } = useAuth();

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
    initialData: () => getSyncCachedData<BalanceSummary>('/balances/summary'),
    staleTime: 60 * 1000,
  });

  const { data: activity = [], isLoading: isActivityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['recent_activity'],
    queryFn: () => api<ActivityItem[]>('GET', '/activity?limit=6'),
    initialData: () => getSyncCachedData<ActivityItem[]>('/activity?limit=6') || [],
    staleTime: 60 * 1000,
  });

  if (isSummaryLoading && !summary) {
    return <DashboardSkeleton />;
  }

  if ((summaryError && !summary) || !summary) {
    return (
      <Card className="p-4 xs:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Summary could not load</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your expenses are safe. Try reloading.
            </p>
            <Button size="sm" className="mt-3 h-9 text-xs" onClick={() => void refetchSummary()}>
              Try again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const netBalance = Number(summary.owedToMe || 0) - Number(summary.owedByMe || 0);
  const hasDebts = summary.myDebts?.some((debt) => Number(debt.outstanding || 0) > 0) ?? false;
  const hasCredits = summary.pairwise?.some((credit) => Number(credit.outstanding || 0) > 0) ?? false;

  return (
    <main className="space-y-5 sm:space-y-6">
      {/* ── Page header ──────────────────────────────────── */}
      <header className="space-y-3">
        <div className="min-w-0">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{user?.householdName || 'Household ledger'}</p>
          <h1 className="mt-1 text-2xl xs:text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl">
            Hi, {user?.fullName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Current standing across all flat expenses and settlements.</p>
        </div>
        {/* Action buttons – 2-col grid on mobile, row on sm+ */}
        <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:flex sm:flex-wrap">
          <Button onClick={() => onNavigate('personal')} className="h-10 xs:h-11 text-xs xs:text-sm font-semibold">
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Add expense
          </Button>
          <Button variant="outline" onClick={() => onNavigate('repayments')} className="h-10 xs:h-11 text-xs xs:text-sm">
            Settle up
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={onOpenVoice} className="hidden sm:inline-flex h-10 xs:h-11 text-xs xs:text-sm">
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            Voice input
          </Button>
        </div>
      </header>

      {/* ── Net position hero card ────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          {/* Top: large net amount */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Your net position</p>
              <p className="mt-1 font-serif text-3xl xs:text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                {formatPaise(Math.abs(netBalance))}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span
                  className={
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' +
                    (netBalance >= 0 ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative')
                  }
                >
                  {netBalance >= 0
                    ? <ArrowDownLeft className="h-3 w-3" aria-hidden="true" />
                    : <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
                </span>
                <span className="text-xs font-semibold">
                  {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled up!'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: owe / owed-to-you chips */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-negative-soft px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">You owe</p>
              <p className="mt-0.5 font-mono text-base xs:text-lg font-bold text-negative">
                {formatPaise(summary.owedByMe)}
              </p>
            </div>
            <div className="rounded-lg bg-positive-soft px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
              <p className="mt-0.5 font-mono text-base xs:text-lg font-bold text-positive">
                {formatPaise(summary.owedToMe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Spending Ledger Row (Editorial Typographic Ledger) ── */}
      <section aria-labelledby="spending-summary-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="spending-summary-heading" className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
            Current Outflow
          </h2>
          <span className="text-xs text-muted-foreground">Household active totals</span>
        </div>

        <div className="rounded-lg border border-border bg-card divide-y sm:divide-y-0 sm:divide-x divide-border grid grid-cols-1 sm:grid-cols-3 shadow-xs overflow-hidden">
          {/* Personal */}
          <button
            type="button"
            onClick={() => onNavigate('personal')}
            className="p-4 sm:p-5 flex flex-col justify-between text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-baseline justify-between gap-1 w-full">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                Personal
              </span>
              <span className="text-xs text-muted-foreground">Not shared</span>
            </div>
            <div className="my-2.5">
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                {formatPaise(summary.personalSpending || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Individual expenses paid strictly for yourself.</p>
          </button>

          {/* Common share */}
          <button
            type="button"
            onClick={() => onNavigate('common')}
            className="p-4 sm:p-5 flex flex-col justify-between text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-baseline justify-between gap-1 w-full">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                Common Share
              </span>
              <span className="text-xs text-muted-foreground font-mono">Paid {formatPaise(summary.commonPaid || 0)}</span>
            </div>
            <div className="my-2.5">
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                {formatPaise(summary.commonShare || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Your portion of split rent, utilities, and flat groceries.</p>
          </button>

          {/* Bought for others */}
          <button
            type="button"
            onClick={() => onNavigate('purchases_made')}
            className="p-4 sm:p-5 flex flex-col justify-between text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-baseline justify-between gap-1 w-full">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                Flatmate Advances
              </span>
              <span className="text-xs text-primary font-medium inline-flex items-center gap-0.5">
                View <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2.5">
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                {formatPaise(summary.advancedForOthers || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Purchases fronted for flatmates to be settled and repaid.</p>
          </button>
        </div>
      </section>

      {/* ── Outstanding balances – 2-col on lg ───────────── */}
      <section className="grid grid-cols-1 gap-3 xs:gap-4 lg:grid-cols-2" aria-label="Outstanding balances">
        {/* You owe */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border p-3.5 xs:p-4">
            <div className="min-w-0">
              <CardTitle className="text-sm xs:text-base font-bold text-foreground">You owe</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Payments to make</p>
            </div>
            <Badge variant={hasDebts ? 'neg' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5">
              {formatPaise(summary.owedByMe)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {!hasDebts ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <CheckCircle className="h-6 w-6 text-positive" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">Nothing to pay</p>
                <p className="mt-0.5 text-xs text-muted-foreground">You're completely up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.myDebts.filter((d) => d.outstanding > 0).map((debt) => (
                  <div key={debt.creditorId} className="flex items-center gap-3 p-3 xs:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-semibold text-foreground">{debt.creditorName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Repaid {formatPaise(debt.confirmedPaid)} of {formatPaise(debt.grossOwe)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="amount-display text-xs xs:text-sm font-bold text-negative">{formatPaise(debt.outstanding)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('repayments')}
                        className="h-8 px-3 text-xs font-semibold"
                      >
                        Repay
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
              <p className="mt-0.5 text-xs text-muted-foreground">Money coming back</p>
            </div>
            <Badge variant={hasCredits ? 'pos' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5">
              {formatPaise(summary.owedToMe)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {!hasCredits ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">No pending repayments</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Nothing waiting to come back.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.pairwise.filter((c) => c.outstanding > 0).map((credit) => (
                  <div key={credit.debtorId} className="flex items-center gap-3 p-3 xs:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-semibold text-foreground">{credit.debtorName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {credit.crossOffset && credit.crossOffset > 0
                          ? `Confirmed ${formatPaise(credit.confirmedPaid)} • Netted`
                          : `Confirmed ${formatPaise(credit.confirmedPaid)} of ${formatPaise(credit.grossOwed)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="amount-display text-xs xs:text-sm font-bold text-positive">{formatPaise(credit.outstanding)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('repayments')}
                        className="h-8 px-3 text-xs font-semibold"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Recent activity ───────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-2 border-b border-border p-3 xs:p-4">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Recent activity
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest changes in your household</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isActivityLoading && activity.length === 0 ? (
            <div className="space-y-2 p-3" aria-label="Loading recent activity" aria-busy="true">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-semibold">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">New expenses and repayments will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 xs:gap-3 p-3 xs:p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {item.actor_name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">
                      <span className="font-semibold">{item.actor_name || 'A household member'}</span>{' '}
                      {item.action === 'create'
                        ? 'recorded a new'
                        : item.action === 'delete'
                          ? 'deleted a'
                          : item.action === 'confirm'
                            ? 'confirmed'
                            : item.action}{' '}
                      <span className="font-medium text-primary">{item.entity_type}</span>
                      {item.metadata?.amount_paise != null && (
                        <span className="ml-1 font-mono text-xs tabular-nums font-semibold">
                          ({formatPaise(item.metadata.amount_paise)})
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
