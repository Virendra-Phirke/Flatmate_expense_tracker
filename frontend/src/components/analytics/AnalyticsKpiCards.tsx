import React from 'react';
import { AnalyticsKpi, AnalyticsTypeDistribution } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Users, Receipt, ShoppingBag, TrendingUp, Sparkles } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { ShineBorder } from '@/components/magicui/shine-border';
import { MagicCard } from '@/components/magicui/magic-card';
import { AnimatedShinyText } from '@/components/magicui/animated-shiny-text';

interface AnalyticsKpiCardsProps {
  kpi: AnalyticsKpi;
  typeDistribution: AnalyticsTypeDistribution;
}

export function AnalyticsKpiCards({ kpi, typeDistribution }: AnalyticsKpiCardsProps) {
  const cards = [
    {
      id: 'total',
      title: 'Total Spending',
      amountPaise: kpi.totalSpendingPaise,
      badge: `${kpi.transactionCount} txns`,
      subtext: `Avg: ${formatPaise(kpi.dailyAveragePaise)}/d`,
      icon: Wallet,
      accent: 'text-primary',
      bgSoft: 'bg-primary/15',
      borderSoft: 'border-primary/40',
      glowColor: 'rgba(6, 182, 212, 0.22)',
      isHero: true,
    },
    {
      id: 'common',
      title: 'Household Share',
      amountPaise: kpi.commonSharePaise,
      badge: `${typeDistribution.commonPercentage.toFixed(1)}%`,
      subtext: 'Split flat expenses',
      icon: Users,
      accent: 'text-cyan-400',
      bgSoft: 'bg-cyan-500/10',
      borderSoft: 'border-cyan-500/30',
      glowColor: 'rgba(6, 182, 212, 0.18)',
      isHero: false,
    },
    {
      id: 'personal',
      title: 'Personal Costs',
      amountPaise: kpi.personalSpendingPaise,
      badge: `${typeDistribution.personalPercentage.toFixed(1)}%`,
      subtext: 'Direct personal spend',
      icon: Receipt,
      accent: 'text-emerald-400',
      bgSoft: 'bg-emerald-500/10',
      borderSoft: 'border-emerald-500/30',
      glowColor: 'rgba(16, 185, 129, 0.18)',
      isHero: false,
    },
    {
      id: 'on_behalf',
      title: 'For Flatmates',
      amountPaise: kpi.onBehalfPaidPaise,
      badge: `${typeDistribution.onBehalfPercentage.toFixed(1)}%`,
      subtext: 'Reimbursable purchases',
      icon: ShoppingBag,
      accent: 'text-violet-400',
      bgSoft: 'bg-violet-500/10',
      borderSoft: 'border-violet-500/30',
      glowColor: 'rgba(139, 92, 246, 0.18)',
      isHero: false,
    },
  ];

  return (
    <section
      aria-label="Expense executive key metrics"
      role="region"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
    >
      {cards.map((c) => {
        const Icon = c.icon;

        const cardContent = (
          <div className="p-3 xs:p-3.5 sm:p-5 flex flex-col justify-between h-full relative z-10 touch-manipulation select-none">
            <div className="flex items-start justify-between gap-1.5">
              <span
                className={`flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl ${c.bgSoft} ${c.accent} shrink-0 transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
              </span>

              {c.isHero ? (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-primary px-1.5 xs:px-2 py-0.5 rounded-md border border-primary/40 bg-primary/10 truncate max-w-[85px] xs:max-w-none text-right">
                  <Sparkles className="h-2.5 w-2.5 shrink-0 hidden xs:inline" />
                  <AnimatedShinyText shimmerWidth={80}>{c.badge}</AnimatedShinyText>
                </span>
              ) : (
                <span className="font-mono text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-muted-foreground px-1.5 xs:px-2 py-0.5 rounded-md border border-border bg-secondary/80 truncate max-w-[70px] xs:max-w-none text-right">
                  {c.badge}
                </span>
              )}
            </div>

            <div className="mt-2.5 xs:mt-3">
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {c.title}
              </p>
              <h3 className="mt-0.5 text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono truncate">
                <NumberTicker value={c.amountPaise} />
              </h3>
              <p className="mt-0.5 sm:mt-1 text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {c.subtext}
              </p>
            </div>
          </div>
        );

        if (c.isHero) {
          return (
            <ShineBorder
              key={c.id}
              borderRadius={16}
              borderWidth={1.5}
              duration={7}
              color={['hsl(var(--primary))', '#10b981', '#8b5cf6']}
              className="h-full shadow-xs active:scale-[0.98] transition-transform duration-150"
            >
              {cardContent}
            </ShineBorder>
          );
        }

        return (
          <MagicCard
            key={c.id}
            gradientColor={c.glowColor}
            gradientSize={200}
            className={`border ${c.borderSoft} group transition-all duration-200 active:scale-[0.98] hover:border-primary/50 hover:shadow-md h-full`}
          >
            {cardContent}
          </MagicCard>
        );
      })}
    </section>
  );
}
