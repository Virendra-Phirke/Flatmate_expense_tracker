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
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  ArrowRightLeft,
} from '@/components/ui/icons';
import { motion } from 'motion/react';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { getSyncCachedData } from '@/lib/idb';
import { openWhatsAppReminder } from '@/lib/whatsapp';

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

  const { data: myUpi } = useQuery<{ upi_id: string } | null>({
    queryKey: ['my_upi_profile'],
    queryFn: () => api('GET', '/profile/upi'),
    staleTime: 5 * 60 * 1000,
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
            <Button size="sm" className="mt-3 h-8 text-xs" onClick={() => void refetchSummary()}>
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
    <div className="space-y-3.5">
      {/* ── 1. Top Compact Metric Cards (Fit-to-Screen) ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Metric 1: Net Position */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.12 }}
          className="rounded-lg border border-border bg-card p-3 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Net Position
            </span>
            <span
              className={
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ' +
                (netBalance >= 0 ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative')
              }
            >
              {netBalance >= 0 ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
            </span>
          </div>
          <div className="my-1.5">
            <p className="text-lg xs:text-xl font-mono font-bold tracking-tight text-foreground truncate">
              {formatPaise(Math.abs(netBalance))}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {netBalance > 0
              ? 'You are owed overall'
              : netBalance < 0
              ? 'You owe overall'
              : 'All settled up'}
          </p>
        </motion.div>

        {/* Metric 2: You Owe */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.12 }}
          onClick={() => onNavigate('repayments')}
          className="rounded-lg border border-border bg-card p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-negative/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              You Owe
            </span>
            <span className="text-[10px] text-negative font-medium">To Pay</span>
          </div>
          <div className="my-1.5">
            <p className="text-lg xs:text-xl font-mono font-bold tracking-tight text-negative truncate">
              {formatPaise(summary.owedByMe)}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate flex items-center justify-between">
            <span>{hasDebts ? 'Pending debts' : 'Clean slate'}</span>
            <span className="text-[10px] text-foreground font-semibold inline-flex items-center">
              Settle <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
            </span>
          </p>
        </motion.div>

        {/* Metric 3: Owed to You */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.12 }}
          onClick={() => onNavigate('repayments')}
          className="rounded-lg border border-border bg-card p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-positive/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Owed to You
            </span>
            <span className="text-[10px] text-positive font-medium">Coming Back</span>
          </div>
          <div className="my-1.5">
            <p className="text-lg xs:text-xl font-mono font-bold tracking-tight text-positive truncate">
              {formatPaise(summary.owedToMe)}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate flex items-center justify-between">
            <span>{hasCredits ? 'Receivables' : 'Zero pending'}</span>
            <span className="text-[10px] text-foreground font-semibold inline-flex items-center">
              View <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
            </span>
          </p>
        </motion.div>

        {/* Metric 4: Common Share */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.12 }}
          onClick={() => onNavigate('common')}
          className="rounded-lg border border-border bg-card p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Common Share
            </span>
            <span className="text-[10px] text-muted-foreground">Household</span>
          </div>
          <div className="my-1.5">
            <p className="text-lg xs:text-xl font-mono font-bold tracking-tight text-foreground truncate">
              {formatPaise(summary.commonShare || 0)}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            Paid {formatPaise(summary.commonPaid || 0)} total
          </p>
        </motion.div>
      </div>

      {/* ── 2. Compact Spending Quick-Ledger Row ────────────────── */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
            Current Outflow:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-auto">
          <button
            type="button"
            onClick={() => onNavigate('personal')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/70 hover:bg-secondary text-foreground transition-colors"
          >
            <span className="text-muted-foreground font-medium">Personal:</span>
            <span className="font-mono font-bold">{formatPaise(summary.personalSpending || 0)}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('common')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/70 hover:bg-secondary text-foreground transition-colors"
          >
            <span className="text-muted-foreground font-medium">Common:</span>
            <span className="font-mono font-bold">{formatPaise(summary.commonShare || 0)}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('purchases_made')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/70 hover:bg-secondary text-foreground transition-colors"
          >
            <span className="text-muted-foreground font-medium">Advances:</span>
            <span className="font-mono font-bold">{formatPaise(summary.advancedForOthers || 0)}</span>
          </button>
        </div>
      </div>

      {/* ── 3. High-Density 2-Column Responsive Body ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column (7 cols): Balances & Settlement Actions */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Section: Debts / Money to Pay */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3.5 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  You Owe
                </CardTitle>
              </div>
              <Badge
                variant={hasDebts ? 'neg' : 'secondary'}
                className="text-[11px] font-mono font-semibold px-2 py-0.5"
              >
                {formatPaise(summary.owedByMe)}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {!hasDebts ? (
                <div className="flex items-center gap-2.5 px-3.5 py-3 text-xs text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-positive shrink-0" />
                  <span>No outstanding debts. You are completely up to date!</span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {summary.myDebts
                    .filter((d) => d.outstanding > 0)
                    .map((debt) => (
                      <div
                        key={debt.creditorId}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{debt.creditorName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Repaid {formatPaise(debt.confirmedPaid)} of {formatPaise(debt.grossOwe)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-negative">
                            {formatPaise(debt.outstanding)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('repayments')}
                            className="h-7 px-2.5 text-xs font-semibold"
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

          {/* Section: Receivables / Money Coming Back */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3.5 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Owed to You
                </CardTitle>
              </div>
              <Badge
                variant={hasCredits ? 'pos' : 'secondary'}
                className="text-[11px] font-mono font-semibold px-2 py-0.5"
              >
                {formatPaise(summary.owedToMe)}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {!hasCredits ? (
                <div className="flex items-center gap-2.5 px-3.5 py-3 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>No pending repayments waiting to come back.</span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {summary.pairwise
                    .filter((c) => c.outstanding > 0)
                    .map((credit) => (
                      <div
                        key={credit.debtorId}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{credit.debtorName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {credit.crossOffset && credit.crossOffset > 0
                              ? `Confirmed ${formatPaise(credit.confirmedPaid)} • Netted`
                              : `Confirmed ${formatPaise(credit.confirmedPaid)} of ${formatPaise(credit.grossOwed)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-bold text-positive mr-1">
                            {formatPaise(credit.outstanding)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openWhatsAppReminder({
                                debtorName: credit.debtorName,
                                amountPaise: credit.outstanding,
                                myUpiId: myUpi?.upi_id,
                                myFullName: user?.fullName,
                                householdName: user?.householdName,
                              })
                            }
                            className="h-7 px-2 text-xs font-semibold text-positive border-positive/30 hover:bg-positive-soft/50"
                            title="Send WhatsApp reminder with UPI link"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onNavigate('repayments')}
                            className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
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
        </div>

        {/* Right Column (5 cols): Recent Activity Feed */}
        <div className="lg:col-span-5">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3.5 border-b border-border bg-card">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Recent Ledger Activity
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {isActivityLoading && activity.length === 0 ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">No recent activity</p>
                  <p className="mt-0.5">Recorded transactions and settlements will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 px-3.5 py-2 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground mt-0.5">
                        {item.actor_name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug truncate">
                          <span className="font-semibold text-foreground">{item.actor_name || 'Member'}</span>{' '}
                          <span className="text-muted-foreground">
                            {item.action === 'create'
                              ? 'added'
                              : item.action === 'confirm'
                              ? 'confirmed'
                              : item.action === 'delete'
                              ? 'removed'
                              : item.action}
                          </span>{' '}
                          <span className="font-medium text-primary">{item.entity_type}</span>
                          {item.metadata?.amount_paise != null && (
                            <span className="ml-1 font-mono font-bold text-foreground">
                              ({formatPaise(item.metadata.amount_paise)})
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
