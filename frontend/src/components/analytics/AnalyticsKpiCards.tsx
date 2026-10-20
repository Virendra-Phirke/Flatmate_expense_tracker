import React from 'react';
import { AnalyticsKpi, AnalyticsTypeDistribution } from '@/types';
import { formatPaise } from '@/lib/utils';
import { NumberTicker } from '@/components/magicui/number-ticker';

interface AnalyticsKpiCardsProps {
  kpi: AnalyticsKpi;
  typeDistribution: AnalyticsTypeDistribution;
}

export function AnalyticsKpiCards({ kpi, typeDistribution }: AnalyticsKpiCardsProps) {
  return (
    <section
      aria-label="Executive spending breakdown"
      className="rounded-xl border border-border bg-card shadow-xs overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border grid grid-cols-1 lg:grid-cols-12"
    >
      {/* ── Left Hero: Total Outflow (Editorial Ledger Emphasis) ── */}
      <article className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-card">
        <header className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
            Total Outflow
          </span>
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-border bg-secondary text-secondary-foreground font-medium">
            {kpi.transactionCount} {kpi.transactionCount === 1 ? 'record' : 'records'}
          </span>
        </header>

        <div className="my-5">
          <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
            <NumberTicker value={kpi.totalSpendingPaise} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Averages{' '}
            <span className="font-mono font-medium text-foreground">
              {formatPaise(kpi.dailyAveragePaise)}
            </span>{' '}
            per day across all logged payments in this period.
          </p>
        </div>

        <footer className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Active filter scope</span>
          <span className="font-mono font-medium text-foreground">100% of ledger</span>
        </footer>
      </article>

      {/* ── Right Columns: Editorial Breakdown (Household, Personal, Flatmates) ── */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border bg-card">
        {/* Household Share */}
        <article className="p-4 sm:p-5 flex flex-col justify-between">
          <header className="flex items-baseline justify-between gap-1">
            <h3 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              Household
            </h3>
            <span className="font-mono text-xs font-semibold text-foreground">
              {typeDistribution.commonPercentage.toFixed(1)}%
            </span>
          </header>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
              <NumberTicker value={kpi.commonSharePaise} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal">
            Your portion of shared flat expenses like Wi-Fi, maid, and utilities.
          </p>
        </article>

        {/* Personal Spend */}
        <article className="p-4 sm:p-5 flex flex-col justify-between">
          <header className="flex items-baseline justify-between gap-1">
            <h3 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              Personal
            </h3>
            <span className="font-mono text-xs font-semibold text-foreground">
              {typeDistribution.personalPercentage.toFixed(1)}%
            </span>
          </header>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
              <NumberTicker value={kpi.personalSpendingPaise} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal">
            Individual purchases paid strictly for yourself, excluded from flat splits.
          </p>
        </article>

        {/* Fronted for Flatmates */}
        <article className="p-4 sm:p-5 flex flex-col justify-between">
          <header className="flex items-baseline justify-between gap-1">
            <h3 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              For Flatmates
            </h3>
            <span className="font-mono text-xs font-semibold text-foreground">
              {typeDistribution.onBehalfPercentage.toFixed(1)}%
            </span>
          </header>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
              <NumberTicker value={kpi.onBehalfPaidPaise} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal">
            Purchases you paid up front on behalf of specific flatmates to be repaid.
          </p>
        </article>
      </div>
    </section>
  );
}

