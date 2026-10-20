import React, { useState } from 'react';
import { AnalyticsTypeDistribution, AnalyticsKpi } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Layers } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';

interface TypeDistributionViewProps {
  distribution: AnalyticsTypeDistribution;
  kpi: AnalyticsKpi;
}

export function TypeDistributionView({ distribution, kpi }: TypeDistributionViewProps) {
  const { totalSpendingPaise } = kpi;
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  const types = [
    {
      id: 'common',
      title: 'Household Common',
      description: 'Your split share of shared flat bills, groceries, and utilities.',
      amountPaise: distribution.commonPaise,
      percentage: distribution.commonPercentage,
      color: '#06b6d4',
    },
    {
      id: 'personal',
      title: 'Personal Expenses',
      description: 'Direct individual lifestyle costs paid purely for yourself.',
      amountPaise: distribution.personalPaise,
      percentage: distribution.personalPercentage,
      color: '#10b981',
    },
    {
      id: 'on_behalf',
      title: 'Bought for Flatmates',
      description: 'Items purchased on behalf of flatmates to be settled and repaid.',
      amountPaise: distribution.onBehalfPaise,
      percentage: distribution.onBehalfPercentage,
      color: '#8b5cf6',
    },
  ];

  return (
    <div
      role="region"
      aria-label="Expense type breakdown"
      className="space-y-4 sm:space-y-5"
    >
      {/* Proportional Stacked Meter */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Spending Mix</span>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {formatPaise(totalSpendingPaise)}
          </span>
        </div>

        {/* Multi-segment Progress Bar with interactive selection */}
        <div className="w-full h-3 sm:h-3.5 rounded-lg bg-secondary overflow-hidden flex p-0.5 gap-1 select-none">
          {types.map((t) => {
            if (t.percentage <= 0) return null;
            const isSelected = activeTypeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTypeId(activeTypeId === t.id ? null : t.id)}
                style={{
                  width: `${Math.max(4, t.percentage)}%`,
                  backgroundColor: t.color,
                }}
                className={`h-full rounded transition-opacity duration-150 outline-none focus:ring-2 focus:ring-foreground touch-manipulation ${
                  activeTypeId && !isSelected ? 'opacity-30' : 'opacity-100'
                }`}
                title={`${t.title}: ${t.percentage.toFixed(1)}%`}
                aria-label={`${t.title}: ${t.percentage.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 xs:gap-2 pt-1 text-xs">
          {types.map((t) => {
            const isSelected = activeTypeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTypeId(activeTypeId === t.id ? null : t.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors touch-manipulation min-h-[36px] ${
                  isSelected ? 'bg-secondary border border-border font-semibold shadow-xs' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-muted-foreground text-xs">{t.title}</span>
                <span className="font-mono font-semibold text-foreground text-xs">
                  {t.percentage.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Semantic Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {types.map((t) => {
          const isSelected = activeTypeId === t.id;

          return (
            <article
              key={t.id}
              onClick={() => setActiveTypeId(activeTypeId === t.id ? null : t.id)}
              className={`p-4 sm:p-5 border rounded-xl bg-card transition-colors cursor-pointer active:scale-[0.99] shadow-xs ${
                isSelected
                  ? 'ring-2 ring-primary border-primary'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <header className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                  {t.title}
                </h3>
                <Badge variant="outline" className="font-mono text-xs font-semibold border-border bg-secondary text-secondary-foreground">
                  {t.percentage.toFixed(1)}%
                </Badge>
              </header>

              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                  <NumberTicker value={t.amountPaise} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
              </div>

              <footer className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Share of ledger:</span>
                <span className="font-mono font-medium text-foreground">
                  {totalSpendingPaise > 0 ? (t.amountPaise / totalSpendingPaise).toFixed(2) : '0.00'}x
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

