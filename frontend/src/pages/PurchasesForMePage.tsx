import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OnBehalfForMePurchase } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsivePagination } from '@/components/ui/pagination';
import { ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import { Gift, User, CheckCircle2, AlertCircle, ArrowRight } from '@/components/ui/icons';
import { getSyncCachedData } from '@/lib/idb';

interface PurchasesForMePageProps {
  onNavigateToRepayments: () => void;
}

const PAGE_SIZE = 10;

export function PurchasesForMePage({ onNavigateToRepayments }: PurchasesForMePageProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: purchases = [], isLoading } = useQuery<OnBehalfForMePurchase[]>({
    queryKey: ['purchases_for_me'],
    queryFn: () => api<OnBehalfForMePurchase[]>('GET', '/purchases/for-me'),
    initialData: () => getSyncCachedData<OnBehalfForMePurchase[]>('/purchases/for-me') || [],
  });

  const totalOwed = purchases.reduce(
    (sum, p) => sum + Math.max(0, Number(p.my_total_paise || 0) - Number(p.my_confirmed_paise || 0)),
    0
  );

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const paginatedPurchases = purchases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="space-y-3 sm:space-y-4">
      {/* ── Compact Header ──────────────────────────────── */}
      <header className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">Bought for Me</h1>
            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
              {purchases.length}
            </Badge>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            Items flatmates paid for on your behalf
          </p>
        </div>
        {totalOwed > 0 && (
          <Button onClick={onNavigateToRepayments} size="sm" className="h-7.5 px-2.5 text-xs font-semibold shrink-0 active:scale-95">
            <span>Settle Up</span>
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
          </Button>
        )}
      </header>

      {/* Summary Alert Pill */}
      {totalOwed > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-negative-soft/60 border border-negative/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Due:</span>
            <span className="font-mono text-sm font-bold text-negative">{formatPaise(totalOwed)}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Unrepaid balance</span>
        </div>
      )}

      {isLoading && purchases.length === 0 ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : purchases.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Gift className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-foreground">No purchases bought for you</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
              When flatmates buy items or groceries for you, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {paginatedPurchases.map((purchase) => {
            const outstanding = Math.max(0, Number(purchase.my_total_paise || 0) - Number(purchase.my_confirmed_paise || 0));
            const isSettled = outstanding === 0;

            return (
              <Card key={purchase.id} className="overflow-hidden border-border bg-card shadow-2xs">
                {/* Purchase header */}
                <div className="p-2.5 sm:p-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{purchase.description}</h3>
                        {isSettled ? (
                          <Badge variant="pos" className="text-[10px] font-mono py-0 px-1.5 shrink-0">Settled</Badge>
                        ) : (
                          <Badge variant="neg" className="text-[10px] font-mono py-0 px-1.5 shrink-0">Due {formatPaise(outstanding)}</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                          <span>Paid by <strong className="text-foreground">{purchase.paid_by_name}</strong></span>
                        </span>
                        <span aria-hidden="true">&bull;</span>
                        <span className="font-mono">{purchase.expense_date}</span>
                      </div>
                    </div>

                    {/* Amount + repay button */}
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-foreground">{formatPaise(purchase.my_total_paise)}</div>
                        <div className="text-[10px] text-muted-foreground">My share</div>
                      </div>
                      {!isSettled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onNavigateToRepayments}
                          className="h-7 px-2 text-[11px] font-semibold border-border active:scale-95"
                        >
                          Repay
                          <ArrowRight className="h-2.5 w-2.5 ml-1" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* My items breakdown */}
                <div className="p-2 sm:p-2.5 bg-muted/20">
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {purchase.my_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2 py-1 text-xs"
                      >
                        <span className="font-medium text-foreground truncate text-[11px]">{item.description}</span>
                        <span className="font-mono font-bold text-foreground text-xs shrink-0">{formatPaise(item.my_share)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {purchases.length > 0 && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={purchases.length}
              pageSize={PAGE_SIZE}
            />
          )}
        </div>
      )}
    </main>
  );
}
