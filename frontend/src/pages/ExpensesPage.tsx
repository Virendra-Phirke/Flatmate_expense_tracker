import React, { useState } from 'react';
import { PersonalExpensesPage } from './PersonalExpensesPage';
import { PurchasesMadePage } from './PurchasesMadePage';
import { Receipt, ShoppingBag } from '@/components/ui/icons';
import { DateFilter, DateFilterValue } from '@/components/ui/DateFilter';

interface ExpensesPageProps {
  initialSubTab?: 'personal' | 'purchases_made';
}

export function ExpensesPage({ initialSubTab = 'personal' }: ExpensesPageProps = {}) {
  const [subTab, setSubTab] = useState<'personal' | 'purchases_made'>(initialSubTab);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });

  return (
    <div className="space-y-6">
      {/* Top Header & Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal spending and items purchased on behalf of flatmates
          </p>
        </div>

        {/* Segmented Control (Section 9.7 & 10.3) */}
        <div
          role="tablist"
          aria-label="Expense views"
          className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-xl bg-secondary p-1 border border-border shrink-0"
        >
          <button
            role="tab"
            aria-selected={subTab === 'personal'}
            type="button"
            onClick={() => setSubTab('personal')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
              subTab === 'personal'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Personal</span>
          </button>
          <button
            role="tab"
            aria-selected={subTab === 'purchases_made'}
            type="button"
            onClick={() => setSubTab('purchases_made')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
              subTab === 'purchases_made'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">Bought for others</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-3 sm:p-3.5 shadow-xs backdrop-blur-xs">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* Render sub-view */}
      {subTab === 'personal' ? (
        <PersonalExpensesPage
          hideTitle
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      ) : (
        <PurchasesMadePage
          hideTitle
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      )}
    </div>
  );
}

export default ExpensesPage;
