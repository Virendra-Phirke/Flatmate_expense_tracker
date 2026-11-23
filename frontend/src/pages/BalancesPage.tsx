import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Share2,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
} from '@/components/ui/icons';

import { BalancesSkeleton } from '@/components/ui/skeleton';
import { getSyncCachedData } from '@/lib/idb';
import { useAuth } from '@/context/AuthContext';
import { openWhatsAppReminder } from '@/lib/whatsapp';
import { MonthlyStatementModal } from '@/components/analytics/MonthlyStatementModal';

interface BalancesPageProps {
  onNavigateToRepayments: (targetMemberId?: string) => void;
}

export function BalancesPage({ onNavigateToRepayments }: BalancesPageProps) {
  const { user } = useAuth();
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  const { data: summary, isLoading, error, refetch } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
    initialData: () => getSyncCachedData<BalanceSummary>('/balances/summary'),
  });

  const { data: myUpi } = useQuery<{ upi_id: string } | null>({
    queryKey: ['my_upi_profile'],
    queryFn: () => api('GET', '/profile/upi'),
    staleTime: 5 * 60 * 1000,
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
            <Button size="sm" className="mt-3 h-8 text-xs" onClick={() => void refetch()}>Try again</Button>
          </div>
        </div>
      </Card>
    );
  }

  const netBalance = Number(summary.owedToMe || 0) - Number(summary.owedByMe || 0);
  const debts = summary.myDebts?.filter((item) => Number(item.outstanding || 0) > 0) ?? [];
  const credits = summary.pairwise?.filter((item) => Number(item.outstanding || 0) > 0) ?? [];

  // Compute Bilateral Debt Matrix mapping for PC & comprehensive audit
  const bilateralMatrix = React.useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      theyOweGross: number;
      theyConfirmedPaid: number;
      theyOutstanding: number;
      youOweGross: number;
      youConfirmedPaid: number;
      youOutstanding: number;
      crossOffset: number;
      netPosition: number; // positive = receivable, negative = payable
    }>();

    // Map credits (flatmates who owe you)
    for (const c of summary.pairwise || []) {
      map.set(c.debtorId, {
        id: c.debtorId,
        name: c.debtorName,
        theyOweGross: c.grossOwed || 0,
        theyConfirmedPaid: c.confirmedPaid || 0,
        theyOutstanding: c.outstanding || 0,
        youOweGross: 0,
        youConfirmedPaid: 0,
        youOutstanding: 0,
        crossOffset: c.crossOffset || 0,
        netPosition: c.outstanding || 0,
      });
    }

    // Map debts (flatmates you owe)
    for (const d of summary.myDebts || []) {
      const existing = map.get(d.creditorId);
      if (existing) {
        existing.youOweGross = d.grossOwe || 0;
        existing.youConfirmedPaid = d.confirmedPaid || 0;
        existing.youOutstanding = d.outstanding || 0;
        existing.crossOffset = Math.max(existing.crossOffset, d.crossOffset || 0);
        existing.netPosition = existing.theyOutstanding - existing.youOutstanding;
      } else {
        map.set(d.creditorId, {
          id: d.creditorId,
          name: d.creditorName,
          theyOweGross: 0,
          theyConfirmedPaid: 0,
          theyOutstanding: 0,
          youOweGross: d.grossOwe || 0,
          youConfirmedPaid: d.confirmedPaid || 0,
          youOutstanding: d.outstanding || 0,
          crossOffset: d.crossOffset || 0,
          netPosition: -(d.outstanding || 0),
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => Math.abs(b.netPosition) - Math.abs(a.netPosition)
    );
  }, [summary]);

  return (
    <main className="space-y-3 sm:space-y-4">
      {/* ── Compact Header ──────────────────────────────── */}
      <header className="flex items-center justify-between gap-2 pb-1 border-b border-border/70">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
            Balances & Settlement
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            Bilateral netting across household bills & flatmate advances
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStatementModalOpen(true)}
            className="h-7.5 px-2.5 text-xs font-semibold border-border hover:bg-muted active:scale-95"
            title="Share Monthly Settlement Statement"
          >
            <Share2 className="h-3 w-3 mr-1" aria-hidden="true" />
            <span className="hidden xs:inline">Statement</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigateToRepayments()}
            className="h-7.5 px-2.5 text-xs font-semibold active:scale-95"
          >
            <span>Settle Up</span>
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* ── Compact "Small Box" Unified Net Position Card ── */}
      <Card className="border-border bg-card p-3 sm:p-4 shadow-xs">
        {/* Net position top summary */}
        <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-border/60">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Net Financial Position
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight ${
                  netBalance > 0
                    ? 'text-positive'
                    : netBalance < 0
                    ? 'text-negative'
                    : 'text-foreground'
                }`}
              >
                {netBalance > 0 ? '+' : ''}
                {formatPaise(Math.abs(netBalance))}
              </span>
            </div>
          </div>

          <Badge
            variant={netBalance > 0 ? 'pos' : netBalance < 0 ? 'neg' : 'secondary'}
            className="text-[11px] font-semibold px-2 py-0.5"
          >
            {netBalance > 0
              ? 'You are owed'
              : netBalance < 0
              ? 'You owe overall'
              : 'Square (₹0)'}
          </Badge>
        </div>

        {/* 4-Box Compact Ledger Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5">
          {/* Box 1: You Owe */}
          <div className="p-2 sm:p-2.5 rounded-lg bg-negative-soft/50 border border-negative/15">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              You Owe
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-negative block truncate mt-0.5">
              {formatPaise(summary.owedByMe || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
              {debts.length ? `${debts.length} to pay` : 'All cleared'}
            </span>
          </div>

          {/* Box 2: Owed to You */}
          <div className="p-2 sm:p-2.5 rounded-lg bg-positive-soft/50 border border-positive/15">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Owed to You
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-positive block truncate mt-0.5">
              {formatPaise(summary.owedToMe || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
              {credits.length ? `${credits.length} pending` : 'None pending'}
            </span>
          </div>

          {/* Box 3: Common Share */}
          <div className="p-2 sm:p-2.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Common Share
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-foreground block truncate mt-0.5">
              {formatPaise(summary.commonShare || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate block mt-0.5 font-mono">
              Paid: {formatPaise(summary.commonPaid || 0)}
            </span>
          </div>

          {/* Box 4: Personal Spending */}
          <div className="p-2 sm:p-2.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Personal Costs
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-foreground block truncate mt-0.5">
              {formatPaise(summary.personalSpending || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
              Sole expense
            </span>
          </div>
        </div>
      </Card>

      {/* ── Member-level outstanding (2 Compact Cards) ──── */}
      <section className="grid grid-cols-1 gap-2.5 lg:grid-cols-2" aria-label="Outstanding balances by member">
        {/* You owe */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-foreground">You Owe</CardTitle>
              <p className="text-[11px] text-muted-foreground">Flatmates you need to repay</p>
            </div>
            <Badge variant={debts.length ? 'neg' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2 py-0.5">
              {formatPaise(summary.owedByMe || 0)}
            </Badge>
          </CardHeader>
          <CardContent className="p-2 sm:p-2.5">
            {debts.length === 0 ? (
              <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground rounded-md bg-muted/20">
                <CheckCircle2 className="h-4 w-4 text-positive shrink-0" aria-hidden="true" />
                <span>You're square. No outstanding payments due.</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {debts.map((debt) => (
                  <div key={debt.creditorId} className="flex items-center justify-between gap-2.5 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{debt.creditorName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {debt.crossOffset && debt.crossOffset > 0
                          ? `Repaid ${formatPaise(debt.confirmedPaid)} • Mutual netted`
                          : `Repaid ${formatPaise(debt.confirmedPaid)} of ${formatPaise(debt.grossOwe)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-xs sm:text-sm font-bold text-negative">
                        {formatPaise(debt.outstanding)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToRepayments(debt.creditorId)}
                        className="h-7 px-2 text-[11px] font-semibold border-border"
                      >
                        Settle
                        <ArrowRight className="h-2.5 w-2.5 ml-1" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owed to you */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-foreground">Owed to You</CardTitle>
              <p className="text-[11px] text-muted-foreground">Flatmates who owe you money</p>
            </div>
            <Badge variant={credits.length ? 'pos' : 'secondary'} className="shrink-0 text-xs font-mono font-semibold px-2 py-0.5">
              {formatPaise(summary.owedToMe || 0)}
            </Badge>
          </CardHeader>
          <CardContent className="p-2 sm:p-2.5">
            {credits.length === 0 ? (
              <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground rounded-md bg-muted/20">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span>No pending receivables from flatmates.</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {credits.map((credit) => (
                  <div key={credit.debtorId} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{credit.debtorName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {credit.crossOffset && credit.crossOffset > 0
                          ? `Confirmed ${formatPaise(credit.confirmedPaid)} • Mutual netted`
                          : `Confirmed ${formatPaise(credit.confirmedPaid)} of ${formatPaise(credit.grossOwed)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-xs sm:text-sm font-bold text-positive">
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
                        className="h-7 px-2 text-[11px] font-semibold text-positive border-positive/30 hover:bg-positive-soft/50 active:scale-95"
                        title="Send WhatsApp reminder with UPI link"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span className="hidden xs:inline">WhatsApp</span>
                        <span className="xs:hidden">Ping</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onNavigateToRepayments(credit.debtorId)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground active:scale-95"
                        title="View settlement details"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Roommate Bilateral Debt Matrix (Optimized for PC & Auditing) ──── */}
      <Card className="border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
                Roommate Bilateral Debt Matrix
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Audited gross vs netted positions per flatmate
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
            {bilateralMatrix.length} member{bilateralMatrix.length === 1 ? '' : 's'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {bilateralMatrix.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No flatmate ledger balances recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 px-3 sm:px-4 font-semibold">Flatmate</th>
                    <th className="py-2 px-3 text-right font-semibold">They Owe You</th>
                    <th className="py-2 px-3 text-right font-semibold">You Owe Them</th>
                    <th className="py-2 px-3 text-right font-semibold hidden md:table-cell">Netting Offset</th>
                    <th className="py-2 px-3 text-right font-semibold">Net Position</th>
                    <th className="py-2 px-3 sm:px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {bilateralMatrix.map((row) => {
                    const isReceivable = row.netPosition > 0;
                    const isPayable = row.netPosition < 0;
                    const isSquare = row.netPosition === 0;

                    return (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground shrink-0">
                              {row.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {row.theyOutstanding > 0 ? (
                            <span className="text-positive font-bold">
                              {formatPaise(row.theyOutstanding)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">₹0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {row.youOutstanding > 0 ? (
                            <span className="text-negative font-bold">
                              {formatPaise(row.youOutstanding)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">₹0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono hidden md:table-cell text-muted-foreground">
                          {row.crossOffset > 0 ? (
                            <span className="text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              -{formatPaise(row.crossOffset)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {isReceivable && (
                            <span className="text-positive inline-flex items-center gap-0.5">
                              <ArrowDownLeft className="h-3 w-3 inline" />
                              +{formatPaise(row.netPosition)}
                            </span>
                          )}
                          {isPayable && (
                            <span className="text-negative inline-flex items-center gap-0.5">
                              <ArrowUpRight className="h-3 w-3 inline" />
                              -{formatPaise(Math.abs(row.netPosition))}
                            </span>
                          )}
                          {isSquare && (
                            <span className="text-muted-foreground font-normal">
                              Square
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          {isReceivable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openWhatsAppReminder({
                                  debtorName: row.name,
                                  amountPaise: row.netPosition,
                                  myUpiId: myUpi?.upi_id,
                                  myFullName: user?.fullName,
                                  householdName: user?.householdName,
                                })
                              }
                              className="h-6.5 px-2 text-[10px] font-semibold text-positive border-positive/30 hover:bg-positive-soft/50 active:scale-95"
                            >
                              <MessageSquare className="h-2.5 w-2.5 mr-1" />
                              <span>Ping</span>
                            </Button>
                          ) : isPayable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigateToRepayments(row.id)}
                              className="h-6.5 px-2 text-[10px] font-semibold border-border active:scale-95"
                            >
                              <span>Settle</span>
                              <ArrowRight className="h-2.5 w-2.5 ml-1" />
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                              <CheckCircle2 className="h-3 w-3 text-positive" />
                              <span className="hidden sm:inline">Clean</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Settlement Statement Modal */}
      <MonthlyStatementModal
        open={statementModalOpen}
        onOpenChange={setStatementModalOpen}
        summary={summary}
      />
    </main>
  );
}
