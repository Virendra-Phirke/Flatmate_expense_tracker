import React, { useState } from 'react';
import { AnalyticsTypeDistribution, AnalyticsKpi } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt, ShoppingBag, Layers } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { MagicCard } from '@/components/magicui/magic-card';

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
      description: 'Your split share of shared flat bills, groceries & utilities',
      amountPaise: distribution.commonPaise,
      percentage: distribution.commonPercentage,
      icon: Users,
      color: '#06b6d4',
      bgSoft: 'bg-cyan-500/10',
      borderSoft: 'border-cyan-500/30',
      textAccent: 'text-cyan-400',
      glowColor: 'rgba(6, 182, 212, 0.22)',
    },
    {
      id: 'personal',
      title: 'Personal Expenses',
      description: 'Direct individual lifestyle costs exclusively for yourself',
      amountPaise: distribution.personalPaise,
      percentage: distribution.personalPercentage,
      icon: Receipt,
      color: '#10b981',
      bgSoft: 'bg-emerald-500/10',
      borderSoft: 'border-emerald-500/30',
      textAccent: 'text-emerald-400',
      glowColor: 'rgba(16, 185, 129, 0.22)',
    },
    {
      id: 'on_behalf',
      title: 'Bought for Flatmates',
      description: 'Items purchased on behalf of flatmates to be settled and repaid',
      amountPaise: distribution.onBehalfPaise,
      percentage: distribution.onBehalfPercentage,
      icon: ShoppingBag,
      color: '#8b5cf6',
      bgSoft: 'bg-violet-500/10',
      borderSoft: 'border-violet-500/30',
      textAccent: 'text-violet-400',
      glowColor: 'rgba(139, 92, 246, 0.22)',
    },
  ];

  return (
    <div
      role="region"
      aria-label="Expense type portfolio distribution"
      className="space-y-4 sm:space-y-5"
    >
      {/* Proportional Stacked Meter */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-5 shadow-xs backdrop-blur-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Spending Mix Portfolio</span>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {formatPaise(totalSpendingPaise)}
          </span>
        </div>

        {/* Multi-segment Progress Bar with interactive selection */}
        <div className="w-full h-4 sm:h-5 rounded-xl bg-muted/40 overflow-hidden flex p-0.5 gap-1 select-none">
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
                className={`h-full rounded-lg transition-all duration-300 relative outline-none focus:ring-2 focus:ring-white touch-manipulation ${
                  activeTypeId && !isSelected ? 'opacity-35' : 'opacity-100 scale-100'
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
                className={`flex items-center gap-1.5 xs:gap-2 px-2.5 py-1.5 rounded-lg transition-all touch-manipulation min-h-[36px] ${
                  isSelected ? 'bg-secondary border border-border font-semibold shadow-xs' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-muted-foreground text-[10px] xs:text-[11px] sm:text-xs">{t.title}</span>
                <span className="font-mono font-semibold text-foreground text-[10px] xs:text-[11px] sm:text-xs">
                  {t.percentage.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Detailed Magic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {types.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTypeId === t.id;

          return (
            <MagicCard
              key={t.id}
              gradientColor={t.glowColor}
              gradientSize={220}
              onClick={() => setActiveTypeId(activeTypeId === t.id ? null : t.id)}
              className={`p-4 sm:p-5 border transition-all cursor-pointer active:scale-[0.98] duration-200 ${
                isSelected
                  ? 'ring-2 ring-primary border-primary shadow-md bg-card/95'
                  : `${t.borderSoft} bg-card/80 hover:shadow-md hover:-translate-y-0.5`
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${t.bgSoft} ${t.textAccent}`}>
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </span>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-[11px] font-bold border-border bg-secondary/80">
                  {t.percentage.toFixed(1)}%
                </Badge>
              </div>

              <div className="mt-3.5 sm:mt-4">
                <h3 className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.title}
                </h3>
                <p className="mt-0.5 text-lg xs:text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                  <NumberTicker value={t.amountPaise} />
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {t.description}
                </p>
              </div>

              <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Portfolio Share:</span>
                <span className="font-mono font-semibold text-foreground">
                  {totalSpendingPaise > 0 ? (t.amountPaise / totalSpendingPaise).toFixed(2) : '0.00'}x
                </span>
              </div>
            </MagicCard>
          );
        })}
      </div>
    </div>
  );
}
