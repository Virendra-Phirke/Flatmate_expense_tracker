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

  // Identify featured type: either selected or the largest share by amount
  const sortedTypes = [...types].sort((a, b) => b.amountPaise - a.amountPaise);
  const primaryType = types.find((t) => t.id === activeTypeId) || sortedTypes[0];
  const secondaryTypes = types.filter((t) => t.id !== primaryType.id);

  return (
    <div
      role="region"
      aria-label="Expense type breakdown"
      className="space-y-4 sm:space-y-5"
    >
      {/* Proportional Stacked Meter */}
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-foreground">Spending Mix</h3>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {formatPaise(totalSpendingPaise)}
          </span>
        </div>

        {/* Multi-segment Progress Bar with interactive selection */}
        <div className="w-full h-3 sm:h-3.5 rounded-md bg-secondary overflow-hidden flex p-0.5 gap-1 select-none">
          {types.map((t) => {
            if (t.percentage <= 0) return null;
            const isSelected = primaryType.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTypeId(t.id)}
                style={{
                  width: `${Math.max(4, t.percentage)}%`,
                  backgroundColor: t.color,
                }}
                className={`h-full rounded-sm transition-opacity duration-150 outline-none focus:ring-2 focus:ring-foreground touch-manipulation ${
                  isSelected ? 'opacity-100 ring-1 ring-background' : 'opacity-40 hover:opacity-80'
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
            const isSelected = primaryType.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTypeId(t.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-[color,background-color] duration-100 touch-manipulation min-h-[36px] ${
                  isSelected
                    ? 'bg-secondary border border-border font-semibold shadow-xs'
                    : 'opacity-70 hover:opacity-100 hover:bg-secondary/40'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden="true" />
                <span className="text-muted-foreground text-xs">{t.title}</span>
                <span className="font-mono font-semibold text-foreground text-xs">
                  {t.percentage.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Asymmetrical Ledger Breakdown: 7-col Primary Spotlight / 5-col Stacked Companions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Primary Stream Spotlight (7 columns on desktop) */}
        <article className="lg:col-span-7 flex flex-col justify-between p-5 sm:p-6 border border-border rounded-lg bg-card shadow-xs">
          <div>
            <header className="flex items-start justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                  Primary Outflow Stream
                </span>
                <h4 className="text-base sm:text-lg font-serif font-bold text-foreground mt-0.5">
                  {primaryType.title}
                </h4>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-semibold border-border bg-secondary text-secondary-foreground">
                {primaryType.percentage.toFixed(1)}% share
              </Badge>
            </header>

            <div className="my-4">
              <p className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
                <NumberTicker value={primaryType.amountPaise} />
              </p>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {primaryType.description}
              </p>
            </div>
          </div>

          <footer className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Ledger multiplier:</span>
            <span className="font-mono font-bold text-foreground">
              {totalSpendingPaise > 0 ? (primaryType.amountPaise / totalSpendingPaise).toFixed(2) : '0.00'}x total volume
            </span>
          </footer>
        </article>

        {/* Secondary Streams Stack (5 columns on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-3.5">
          {secondaryTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTypeId(t.id)}
              className="flex-1 flex flex-col justify-between p-4 border border-border rounded-lg bg-card text-left transition-[border-color,background-color] duration-100 hover:border-foreground/30 hover:bg-secondary/30 active:scale-[0.99] shadow-xs"
            >
              <header className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden="true" />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                    {t.title}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {t.percentage.toFixed(1)}%
                </span>
              </header>

              <div className="my-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {formatPaise(t.amountPaise)}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {t.description}
                </p>
              </div>

              <footer className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground w-full">
                <span>Select for detail</span>
                <span className="font-mono text-foreground font-medium">
                  {totalSpendingPaise > 0 ? (t.amountPaise / totalSpendingPaise).toFixed(2) : '0.00'}x
                </span>
              </footer>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
