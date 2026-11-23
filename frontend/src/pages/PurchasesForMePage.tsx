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
import { Gift, User, CheckCircle2, AlertCircle, ArrowRight, ShoppingBag, ArrowDownLeft, ArrowUpRight } from '@/components/ui/icons';
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

  const totalBoughtForMe = purchases.reduce((sum, p) => sum + Number(p.my_total_paise || 0), 0);
  const totalCleared = purchases.reduce((sum, p) => sum + Number(p.my_confirmed_paise || 0), 0);
  const totalOwed = Math.max(0, totalBoughtForMe - totalCleared);

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
            Items flatmates purchased specifically for you
          </p>
        </div>
        {totalOwed > 0 && (
          <Button onClick={onNavigateToRepayments} size="sm" className="h-7.5 px-2.5 text-xs font-semibold shrink-0 active:scale-95">
            <span>Settle Up</span>
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
          </Button>
        )}
      </header>

      {/* ── 3-Box Compact Metric Summary Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Box 1: Total Value of Items */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Total Items Value
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-0.5 truncate">
              {formatPaise(totalBoughtForMe)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
              {purchases.length} purchase{purchases.length === 1 ? '' : 's'} made for you
            </span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Gift className="h-4 w-4" />
          </div>
        </div>

        {/* Box 2: Total Repaid */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Cleared & Repaid
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-0.5 truncate">
              {formatPaise(totalCleared)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
              Confirmed settlements
            </span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-positive-soft text-positive flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        {/* Box 3: Total Outstanding Due */}
        <div className={`rounded-lg border p-3 shadow-xs flex items-center justify-between ${
          totalOwed > 0 ? 'bg-negative-soft/40 border-negative/25' : 'bg-card border-border'
        }`}>
          <div className="min-w-0 flex-1 mr-2">
            <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold block truncate ${
              totalOwed > 0 ? 'text-negative' : 'text-muted-foreground'
            }`}>
              Outstanding to Pay
            </span>
            <span className={`text-base sm:text-lg font-mono font-bold block mt-0.5 truncate ${
              totalOwed > 0 ? 'text-negative' : 'text-positive'
            }`}>
              {formatPaise(totalOwed)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
              {totalOwed > 0 ? 'Roommates waiting for settlement' : 'All clear with roommates'}
            </span>
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            totalOwed > 0 ? 'bg-negative-soft text-negative' : 'bg-positive-soft text-positive'
          }`}>
            {totalOwed > 0 ? <ArrowUpRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
        </div>
      </div>

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
            const payerInitial = (purchase.paid_by_name || 'F').charAt(0).toUpperCase();

            return (
              <Card key={purchase.id} className="overflow-hidden border-border bg-card shadow-2xs hover:border-border/90 transition-colors">
                {/* Purchase header */}
                <div className="p-2.5 sm:p-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <ShoppingBag className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{purchase.description}</h3>
                          {isSettled ? (
                            <Badge variant="pos" className="text-[10px] font-mono py-0 px-1.5 shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Settled
                            </Badge>
                          ) : (
                            <Badge variant="neg" className="text-[10px] font-mono py-0 px-1.5 shrink-0">Due {formatPaise(outstanding)}</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                          <span className="flex items-center gap-1">
                            <span className="h-4 w-4 rounded-full bg-secondary text-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
                              {payerInitial}
                            </span>
                            <span>Paid by <strong className="text-foreground">{purchase.paid_by_name}</strong></span>
                          </span>
                          <span aria-hidden="true">&bull;</span>
                          <span className="font-mono">{purchase.expense_date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount + repay button */}
                    <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-foreground">{formatPaise(purchase.my_total_paise)}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">My share</div>
                      </div>
                      {!isSettled && (
                        <Button
                          size="sm"
                          onClick={onNavigateToRepayments}
                          className="h-7 px-2.5 text-xs font-semibold shadow-xs active:scale-95"
                        >
                          Repay
                          <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
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
                        className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1 text-xs"
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
