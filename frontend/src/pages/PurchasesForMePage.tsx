import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OnBehalfForMePurchase } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import { Gift, User, CheckCircle2, AlertCircle, ArrowRight } from '@/components/ui/icons';
import { getSyncCachedData } from '@/lib/idb';

interface PurchasesForMePageProps {
  onNavigateToRepayments: () => void;
}

export function PurchasesForMePage({ onNavigateToRepayments }: PurchasesForMePageProps) {
  const { data: purchases = [], isLoading } = useQuery<OnBehalfForMePurchase[]>({
    queryKey: ['purchases_for_me'],
    queryFn: () => api<OnBehalfForMePurchase[]>('GET', '/purchases/for-me'),
    initialData: () => getSyncCachedData<OnBehalfForMePurchase[]>('/purchases/for-me') || [],
  });

  const totalOwed = purchases.reduce(
    (sum, p) => sum + Math.max(0, Number(p.my_total_paise || 0) - Number(p.my_confirmed_paise || 0)),
    0
  );

  return (
    <main className="space-y-5 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-2 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Bought for Me</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {purchases.length} {purchases.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Items your flatmates paid for on your behalf
          </p>
        </div>
      </header>

        {/* Summary + CTA row */}
        {totalOwed > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-negative-soft px-3 xs:px-4 py-2.5 xs:py-3">
            <div>
              <p className="text-[10px] xs:text-xs font-medium text-muted-foreground">Total outstanding</p>
              <p className="amount-display text-base xs:text-lg font-bold text-negative">{formatPaise(totalOwed)}</p>
            </div>
            <Button onClick={onNavigateToRepayments} className="h-9 xs:h-10 text-xs xs:text-sm shrink-0">
              Settle up
              <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </Button>
          </div>
        )}

      {isLoading && purchases.length === 0 ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 xs:py-12 text-center">
            <Gift className="h-10 w-10 xs:h-12 xs:w-12 text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-sm font-semibold">No purchases bought for you</h3>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              When flatmates buy items or groceries for you, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 xs:space-y-4">
          {purchases.map((purchase) => {
            const outstanding = Math.max(0, Number(purchase.my_total_paise || 0) - Number(purchase.my_confirmed_paise || 0));
            const isSettled = outstanding === 0;

            return (
              <Card key={purchase.id} className="overflow-hidden">
                {/* Purchase header */}
                <div className="p-3 xs:p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-semibold text-sm text-foreground">{purchase.description}</h3>
                        {isSettled ? (
                          <Badge variant="pos" className="text-[10px]">Settled</Badge>
                        ) : (
                          <Badge variant="neg" className="text-[10px]">Due {formatPaise(outstanding)}</Badge>
                        )}
                      </div>
                      <div className="text-[10px] xs:text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                          <span>Paid by <strong className="text-foreground">{purchase.paid_by_name}</strong></span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{purchase.expense_date}</span>
                      </div>
                    </div>

                    {/* Amount + repay button on the right */}
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold">{formatPaise(purchase.my_total_paise)}</div>
                      <div className="text-[10px] text-muted-foreground">My share</div>
                      {!isSettled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onNavigateToRepayments}
                          className="mt-1.5 h-7 xs:h-8 px-2 text-[10px] xs:text-xs"
                        >
                          Repay
                          <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* My items breakdown */}
                <div className="p-3 xs:p-4 bg-muted/30">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                    My items
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-1.5 xs:gap-2">
                    {purchase.my_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs"
                      >
                        <span className="font-medium text-foreground truncate">{item.description}</span>
                        <span className="font-mono font-bold text-foreground shrink-0">{formatPaise(item.my_share)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
