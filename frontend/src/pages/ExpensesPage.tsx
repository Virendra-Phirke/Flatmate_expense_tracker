import React, { useState, useEffect } from 'react';
import { PersonalExpensesPage } from './PersonalExpensesPage';
import { PurchasesMadePage } from './PurchasesMadePage';
import { Receipt, ShoppingBag } from '@/components/ui/icons';
import { DateFilterValue } from '@/components/ui/DateFilter';

interface ExpensesPageProps {
  initialSubTab?: 'personal' | 'purchases_made';
  openAddModal?: number;
  onAddModalClose?: () => void;
}

export function ExpensesPage({
  initialSubTab = 'personal',
  openAddModal,
  onAddModalClose,
}: ExpensesPageProps = {}) {
  const [subTab, setSubTab] = useState<'personal' | 'purchases_made'>(initialSubTab);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <main className="space-y-3 sm:space-y-4">
      {/* Top Header & Segmented Control */}
      <header className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">Expenses</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            Personal spending & items bought for flatmates
          </p>
        </div>

        {/* Segmented Control */}
        <div
          role="tablist"
          aria-label="Expense views"
          className="inline-flex rounded-lg bg-muted/60 p-0.5 border border-border shrink-0"
        >
          <button
            role="tab"
            aria-selected={subTab === 'personal'}
            type="button"
            onClick={() => setSubTab('personal')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              subTab === 'personal'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-3 w-3" aria-hidden="true" />
            <span>Personal</span>
          </button>
          <button
            role="tab"
            aria-selected={subTab === 'purchases_made'}
            type="button"
            onClick={() => setSubTab('purchases_made')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              subTab === 'purchases_made'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-3 w-3" aria-hidden="true" />
            <span>For others</span>
          </button>
        </div>
      </header>

      {/* Render sub-view */}
      {subTab === 'personal' ? (
        <PersonalExpensesPage
          hideTitle
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          openAddModal={openAddModal}
          onAddModalClose={onAddModalClose}
        />
      ) : (
        <PurchasesMadePage
          hideTitle
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          openAddModal={openAddModal}
          onAddModalClose={onAddModalClose}
        />
      )}
    </main>
  );
}

export default ExpensesPage;
